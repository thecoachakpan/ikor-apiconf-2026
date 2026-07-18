use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

pub struct WhisperAppState {
    pub audio_buffer: Mutex<Vec<f32>>,
    pub is_recording: Mutex<bool>,
    pub final_transcription: Mutex<String>,
}

impl WhisperAppState {
    pub fn new() -> Self {
        Self {
            audio_buffer: Mutex::new(Vec::new()),
            is_recording: Mutex::new(false),
            final_transcription: Mutex::new(String::new()),
        }
    }
}

#[tauri::command]
pub fn init_whisper_stream(
    _app_handle: AppHandle,
    state: State<'_, WhisperAppState>,
) -> Result<(), String> {
    *state.audio_buffer.lock().unwrap() = Vec::new();
    *state.is_recording.lock().unwrap() = true;
    *state.final_transcription.lock().unwrap() = String::new();

    // In a full streaming implementation, we would spawn a thread here to
    // continuously process the `audio_buffer` as it fills up to reduce latency.
    // For now, we accumulate.

    Ok(())
}

#[tauri::command]
pub fn append_audio_chunk(state: State<'_, WhisperAppState>, chunk: Vec<f32>) {
    let mut buffer = state.audio_buffer.lock().unwrap();
    buffer.extend(chunk);
}

#[tauri::command]
pub fn finish_audio_stream(
    app_handle: AppHandle,
    state: State<'_, WhisperAppState>,
    custom_terms: Option<String>,
    window_context: Option<String>,
) -> Result<String, String> {
    *state.is_recording.lock().unwrap() = false;

    let buffer = state.audio_buffer.lock().unwrap().clone();

    if buffer.is_empty() {
        return Ok("".to_string());
    }

    let local_data = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?;
    let models_dir = local_data.join("models");

    let model_path = if models_dir.join("ggml-base.en.bin").exists() {
        models_dir.join("ggml-base.en.bin")
    } else if models_dir.join("ggml-tiny.en.bin").exists() {
        models_dir.join("ggml-tiny.en.bin")
    } else {
        return Err("No Whisper model found".to_string());
    };

    println!(
        "Initializing native whisper-rs context with model: {:?}",
        model_path
    );
    let params = WhisperContextParameters::default();
    let ctx = WhisperContext::new_with_params(model_path.to_str().unwrap(), params)
        .map_err(|e| format!("Failed to load model: {}", e))?;

    // Run inference
    println!(
        "Native whisper-rs: running inference on {} samples...",
        buffer.len()
    );

    let mut state_inst = ctx.create_state().map_err(|e| e.to_string())?;

    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    params.set_print_progress(false);
    params.set_print_special(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);
    params.set_language(Some("en"));

    let default_prompt = "Please transcribe the following speech accurately. Ignore silence, breathing, and background noise. If there is no speech, leave it blank.";
    let mut prompt_parts = Vec::new();
    prompt_parts.push(default_prompt.to_string());

    if let Some(ref terms) = custom_terms {
        let trimmed = terms.trim();
        if !trimmed.is_empty() {
            prompt_parts.push(format!("Key spelling terms: {}.", trimmed));
        }
    }

    if let Some(ref context) = window_context {
        let trimmed = context.trim();
        if !trimmed.is_empty() {
            prompt_parts.push(format!("Active window context: {}.", trimmed));
        }
    }

    let prompt_str = prompt_parts.join(" ");
    params.set_initial_prompt(&prompt_str);

    state_inst
        .full(params, &buffer)
        .map_err(|e| format!("failed to run model: {}", e))?;

    let num_segments = state_inst.full_n_segments().map_err(|e| e.to_string())?;
    let mut result = String::new();
    for i in 0..num_segments {
        let segment = state_inst
            .full_get_segment_text(i)
            .map_err(|e| e.to_string())?;
        result.push_str(&segment);
    }

    println!("Native whisper-rs: Finished inference.");
    Ok(result.trim().to_string())
}
