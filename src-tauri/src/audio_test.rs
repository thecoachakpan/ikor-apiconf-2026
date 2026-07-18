use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter};

#[derive(Serialize, Deserialize)]
pub struct AudioDevice {
    pub id: String,
    pub label: String,
}

#[derive(Serialize, Deserialize)]
pub struct AudioDevicesResponse {
    pub default_id: Option<String>,
    pub devices: Vec<AudioDevice>,
}

lazy_static::lazy_static! {
    static ref MIC_TEST_RUNNING: AtomicBool = AtomicBool::new(false);
}

#[tauri::command]
pub fn get_audio_devices() -> Result<AudioDevicesResponse, String> {
    let mut devices = Vec::new();
    let mut default_id = None;
    let mut index = 0;

    let default_host = cpal::default_host();
    let default_name = default_host
        .default_input_device()
        .and_then(|d| d.name().ok());

    let mut added_trackers: Vec<(String, cpal::HostId)> = Vec::new();

    // Iterate through all available hosts (e.g. WASAPI and ASIO on Windows) to gather all audio inputs
    for host_id in cpal::available_hosts() {
        if let Ok(host) = cpal::host_from_id(host_id) {
            if let Ok(input_devices) = host.input_devices() {
                for device in input_devices {
                    let name = device
                        .name()
                        .unwrap_or_else(|_| format!("Audio Input Device {}", index));

                    // If this device name was already added from a DIFFERENT host, skip it to avoid cross-host duplicates.
                    // If it's the SAME host, it's a different physical device with the same name, so keep it!
                    if added_trackers
                        .iter()
                        .any(|(n, h)| n == &name && h != &host_id)
                    {
                        continue;
                    }

                    // Count how many times we've seen this name on the same host to give it a unique label
                    let same_name_count = added_trackers
                        .iter()
                        .filter(|(n, h)| n == &name && h == &host_id)
                        .count();
                    let display_label = if same_name_count > 0 {
                        format!("{} ({})", name, same_name_count + 1)
                    } else {
                        name.clone()
                    };

                    let unique_id = format!("{}-{}", name, index);

                    println!("[DEBUG get_audio_devices] Host {:?} found Index {}: name={:?}, label={:?}, id={}", host_id, index, name, display_label, unique_id);

                    if default_id.is_none() && Some(name.clone()) == default_name {
                        default_id = Some(unique_id.clone());
                    }

                    added_trackers.push((name, host_id));
                    devices.push(AudioDevice {
                        id: unique_id,
                        label: display_label,
                    });
                    index += 1;
                }
            }
        }
    }

    println!(
        "[DEBUG get_audio_devices] Total found across hosts: {}, default_id={:?}",
        index, default_id
    );

    Ok(AudioDevicesResponse {
        default_id,
        devices,
    })
}

#[tauri::command]
pub fn start_mic_test(app: AppHandle, device_id: String) -> Result<(), String> {
    // First stop any existing stream
    MIC_TEST_RUNNING.store(false, Ordering::SeqCst);
    std::thread::sleep(std::time::Duration::from_millis(200)); // wait for old thread to die

    MIC_TEST_RUNNING.store(true, Ordering::SeqCst);

    std::thread::spawn(move || {
        let default_host = cpal::default_host();
        let mut target_device = None;

        if device_id == "system-default" || device_id == "auto-detect" {
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

        if let Some(device) = target_device {
            if let Ok(config) = device.default_input_config() {
                let err_fn = move |err| {
                    eprintln!("an error occurred on stream: {}", err);
                };

                let stream = match config.sample_format() {
                    cpal::SampleFormat::F32 => device.build_input_stream(
                        &config.into(),
                        move |data: &[f32], _: &_| {
                            let mut sum = 0.0;
                            for &sample in data {
                                sum += sample * sample;
                            }
                            let rms = (sum / data.len() as f32).sqrt();
                            let volume = (rms * 100.0 * 5.0).clamp(0.0, 100.0);
                            let _ = app.emit("mic_volume_update", volume);
                        },
                        err_fn,
                        None,
                    ),
                    cpal::SampleFormat::I16 => device.build_input_stream(
                        &config.into(),
                        move |data: &[i16], _: &_| {
                            let mut sum = 0.0;
                            for &sample in data {
                                let s = sample as f32 / i16::MAX as f32;
                                sum += s * s;
                            }
                            let rms = (sum / data.len() as f32).sqrt();
                            let volume = (rms * 100.0 * 5.0).clamp(0.0, 100.0);
                            let _ = app.emit("mic_volume_update", volume);
                        },
                        err_fn,
                        None,
                    ),
                    _ => return,
                };

                if let Ok(stream) = stream {
                    if stream.play().is_ok() {
                        while MIC_TEST_RUNNING.load(Ordering::SeqCst) {
                            std::thread::sleep(std::time::Duration::from_millis(100));
                        }
                    }
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn stop_mic_test() -> Result<(), String> {
    MIC_TEST_RUNNING.store(false, Ordering::SeqCst);
    Ok(())
}
