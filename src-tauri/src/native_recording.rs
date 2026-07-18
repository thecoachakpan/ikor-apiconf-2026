use crate::local_whisper_stream::WhisperAppState;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

#[allow(dead_code)]
pub struct SendStream(pub cpal::Stream);
unsafe impl Send for SendStream {}
unsafe impl Sync for SendStream {}

pub struct NativeRecorderState {
    pub audio_buffer: Arc<Mutex<Vec<f32>>>,
    pub is_recording: Arc<AtomicBool>,
    pub stream: Mutex<Option<SendStream>>,
    pub noise_floor: Mutex<f32>,
    pub silence_samples: Arc<Mutex<usize>>,
}

impl NativeRecorderState {
    pub fn new() -> Self {
        Self {
            audio_buffer: Arc::new(Mutex::new(Vec::new())),
            is_recording: Arc::new(AtomicBool::new(false)),
            stream: Mutex::new(None),
            noise_floor: Mutex::new(0.005),
            silence_samples: Arc::new(Mutex::new(0)),
        }
    }
}

#[tauri::command]
pub fn start_native_recording(
    app: AppHandle,
    state: State<'_, NativeRecorderState>,
    whisper_state: State<'_, WhisperAppState>,
    device_id: String,
) -> Result<(), String> {
    // Stop any existing native recording
    state.is_recording.store(false, Ordering::SeqCst);
    *whisper_state.is_recording.lock().unwrap() = false;
    if let Ok(mut guard) = state.stream.lock() {
        *guard = None; // Drops old stream and stops it
    }

    // Reset buffer and states
    *state.audio_buffer.lock().unwrap() = Vec::new();
    *whisper_state.audio_buffer.lock().unwrap() = Vec::new();
    *state.silence_samples.lock().unwrap() = 0;
    *state.noise_floor.lock().unwrap() = 0.005;
    state.is_recording.store(true, Ordering::SeqCst);
    *whisper_state.is_recording.lock().unwrap() = true;

    let default_host = cpal::default_host();
    let mut target_device = None;

    if device_id == "system-default" || device_id == "auto-detect" || device_id.is_empty() {
        target_device = default_host.default_input_device();
    } else {
        let mut added_trackers: Vec<(String, cpal::HostId)> = Vec::new();
        let mut index = 0;

        'outer: for host_id in cpal::available_hosts() {
            if let Ok(host) = cpal::host_from_id(host_id) {
                if let Ok(input_devices) = host.input_devices() {
                    for device in input_devices {
                        let name = device
                            .name()
                            .unwrap_or_else(|_| format!("Audio Input Device {}", index));
                        if added_trackers
                            .iter()
                            .any(|(n, h)| n == &name && h != &host_id)
                        {
                            continue;
                        }

                        let unique_id = format!("{}-{}", name, index);
                        if unique_id == device_id {
                            target_device = Some(device);
                            break 'outer;
                        }

                        added_trackers.push((name, host_id));
                        index += 1;
                    }
                }
            }
        }
    }

    let device =
        target_device.ok_or_else(|| "Failed to find target audio input device".to_string())?;
    let config = device
        .default_input_config()
        .map_err(|e| format!("Failed to get default input config: {}", e))?;
    let sample_rate = config.sample_rate().0;
    let channels = config.channels();

    let audio_buffer = state.audio_buffer.clone();
    let is_recording = state.is_recording.clone();
    let noise_floor = state.noise_floor.lock().unwrap().clone();
    let noise_floor = Arc::new(Mutex::new(noise_floor));
    let silence_samples = state.silence_samples.clone();
    let app_clone = app.clone();

    // VAD Hangover: 1.2 seconds at 16000Hz = 19200 samples
    let hangover_samples = (1.2 * 16000.0) as usize;

    let err_fn = move |err| {
        eprintln!("An error occurred on native recording stream: {}", err);
    };

    let stream = match config.sample_format() {
        cpal::SampleFormat::F32 => {
            let noise_floor = noise_floor.clone();
            let audio_buffer = audio_buffer.clone();
            let is_recording = is_recording.clone();
            let silence_samples = silence_samples.clone();
            let app = app_clone.clone();

            device.build_input_stream(
                &config.into(),
                move |data: &[f32], _: &_| {
                    if !is_recording.load(Ordering::SeqCst) {
                        return;
                    }

                    // 1. Downmix to Mono
                    let mono_samples = downmix_to_mono(data, channels);

                    // 2. Resample to 16kHz
                    let resampled = resample_to_16k(&mono_samples, sample_rate);

                    if resampled.is_empty() {
                        return;
                    }

                    // 3. RMS & Noise Floor calculations
                    let mut sum = 0.0;
                    for &sample in &resampled {
                        sum += sample * sample;
                    }
                    let rms = (sum / resampled.len() as f32).sqrt();

                    // Update noise floor
                    {
                        let mut nf = noise_floor.lock().unwrap();
                        if rms < *nf {
                            *nf = *nf * 0.8 + rms * 0.2;
                        } else {
                            *nf = *nf * 0.999 + rms * 0.001;
                        }
                    }

                    let current_noise_floor = *noise_floor.lock().unwrap();
                    let threshold = (current_noise_floor * 1.8).max(0.008);
                    let is_speech = rms > threshold;

                    let mut sil_samples = silence_samples.lock().unwrap();
                    if is_speech {
                        *sil_samples = 0;
                    } else {
                        *sil_samples += resampled.len();
                    }

                    // Only append to output buffer if speech or inside hangover window
                    if is_speech || *sil_samples < hangover_samples {
                        let mut buf = audio_buffer.lock().unwrap();
                        buf.extend_from_slice(&resampled);

                        use tauri::Manager;
                        if let Some(w_state) = app.try_state::<WhisperAppState>() {
                            let mut w_buf = w_state.audio_buffer.lock().unwrap();
                            w_buf.extend_from_slice(&resampled);
                        }
                    }

                    // Emit visualizer volume update (0..100)
                    let volume = (rms * 100.0 * 5.0).clamp(0.0, 100.0);
                    let _ = app.emit("mic_volume_update", volume);
                },
                err_fn,
                None,
            )
        }
        cpal::SampleFormat::I16 => {
            let noise_floor = noise_floor.clone();
            let audio_buffer = audio_buffer.clone();
            let is_recording = is_recording.clone();
            let silence_samples = silence_samples.clone();
            let app = app_clone.clone();

            device.build_input_stream(
                &config.into(),
                move |data: &[i16], _: &_| {
                    if !is_recording.load(Ordering::SeqCst) {
                        return;
                    }

                    // Convert i16 to f32
                    let f32_samples: Vec<f32> =
                        data.iter().map(|&s| s as f32 / i16::MAX as f32).collect();

                    // 1. Downmix to Mono
                    let mono_samples = downmix_to_mono(&f32_samples, channels);

                    // 2. Resample to 16kHz
                    let resampled = resample_to_16k(&mono_samples, sample_rate);

                    if resampled.is_empty() {
                        return;
                    }

                    // 3. RMS & Noise Floor calculations
                    let mut sum = 0.0;
                    for &sample in &resampled {
                        sum += sample * sample;
                    }
                    let rms = (sum / resampled.len() as f32).sqrt();

                    // Update noise floor
                    {
                        let mut nf = noise_floor.lock().unwrap();
                        if rms < *nf {
                            *nf = *nf * 0.8 + rms * 0.2;
                        } else {
                            *nf = *nf * 0.999 + rms * 0.001;
                        }
                    }

                    let current_noise_floor = *noise_floor.lock().unwrap();
                    let threshold = (current_noise_floor * 1.8).max(0.008);
                    let is_speech = rms > threshold;

                    let mut sil_samples = silence_samples.lock().unwrap();
                    if is_speech {
                        *sil_samples = 0;
                    } else {
                        *sil_samples += resampled.len();
                    }

                    // Only append to output buffer if speech or inside hangover window
                    if is_speech || *sil_samples < hangover_samples {
                        let mut buf = audio_buffer.lock().unwrap();
                        buf.extend_from_slice(&resampled);

                        use tauri::Manager;
                        if let Some(w_state) = app.try_state::<WhisperAppState>() {
                            let mut w_buf = w_state.audio_buffer.lock().unwrap();
                            w_buf.extend_from_slice(&resampled);
                        }
                    }

                    // Emit visualizer volume update (0..100)
                    let volume = (rms * 100.0 * 5.0).clamp(0.0, 100.0);
                    let _ = app.emit("mic_volume_update", volume);
                },
                err_fn,
                None,
            )
        }
        _ => return Err("Unsupported sample format".to_string()),
    }
    .map_err(|e| format!("Failed to build input stream: {}", e))?;

    stream
        .play()
        .map_err(|e| format!("Failed to play stream: {}", e))?;

    if let Ok(mut guard) = state.stream.lock() {
        *guard = Some(SendStream(stream));
    }

    Ok(())
}

#[tauri::command]
pub fn stop_native_recording(
    state: State<'_, NativeRecorderState>,
    whisper_state: State<'_, WhisperAppState>,
) -> Result<(), String> {
    state.is_recording.store(false, Ordering::SeqCst);
    *whisper_state.is_recording.lock().unwrap() = false;
    if let Ok(mut guard) = state.stream.lock() {
        *guard = None; // Drop stream to stop it
    }

    let buffer = state.audio_buffer.lock().unwrap();
    println!(
        "stop_native_recording: Native recording stopped. Buffer size: {} samples ({} seconds)",
        buffer.len(),
        buffer.len() as f32 / 16000.0
    );
    Ok(())
}

fn downmix_to_mono(input: &[f32], channels: u16) -> Vec<f32> {
    if channels == 1 {
        return input.to_vec();
    }

    let mut mono = Vec::with_capacity(input.len() / channels as usize);
    for chunk in input.chunks_exact(channels as usize) {
        let sum: f32 = chunk.iter().sum();
        mono.push(sum / channels as f32);
    }
    mono
}

fn resample_to_16k(input: &[f32], src_rate: u32) -> Vec<f32> {
    if src_rate == 16000 {
        return input.to_vec();
    }

    let ratio = src_rate as f64 / 16000.0;
    let target_len = (input.len() as f64 / ratio).round() as usize;
    let mut output = Vec::with_capacity(target_len);

    for i in 0..target_len {
        let src_idx = i as f64 * ratio;
        let idx_low = src_idx.floor() as usize;
        let idx_high = (idx_low + 1).min(input.len() - 1);
        let weight = src_idx - idx_low as f64;

        if idx_low < input.len() {
            let val = input[idx_low] * (1.0 - weight) as f32 + input[idx_high] * weight as f32;
            output.push(val);
        }
    }
    output
}

pub fn create_wav_bytes(samples: &[f32], sample_rate: u32) -> Vec<u8> {
    let mut wav = Vec::new();

    // RIFF header
    wav.extend_from_slice(b"RIFF");
    let data_size = samples.len() * 2; // 16-bit PCM = 2 bytes per sample
    let file_size = 36 + data_size;
    wav.extend_from_slice(&(file_size as u32).to_le_bytes());
    wav.extend_from_slice(b"WAVE");

    // fmt subchunk
    wav.extend_from_slice(b"fmt ");
    wav.extend_from_slice(&16u32.to_le_bytes()); // subchunk1_size
    wav.extend_from_slice(&1u16.to_le_bytes()); // audio_format (1 = PCM)
    wav.extend_from_slice(&1u16.to_le_bytes()); // num_channels (1 = mono)
    wav.extend_from_slice(&sample_rate.to_le_bytes()); // sample_rate
    let byte_rate = sample_rate * 2;
    wav.extend_from_slice(&byte_rate.to_le_bytes()); // byte_rate
    wav.extend_from_slice(&2u16.to_le_bytes()); // block_align (num_channels * bytes_per_sample)
    wav.extend_from_slice(&16u16.to_le_bytes()); // bits_per_sample

    // data subchunk
    wav.extend_from_slice(b"data");
    wav.extend_from_slice(&(data_size as u32).to_le_bytes());

    for &sample in samples {
        // Convert f32 (-1.0 to 1.0) to i16
        let s = (sample * 32767.0).clamp(-32768.0, 32767.0) as i16;
        wav.extend_from_slice(&s.to_le_bytes());
    }

    wav
}
