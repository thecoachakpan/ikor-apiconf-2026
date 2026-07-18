## **Configuration for Groq STT and LLM**
# Model: Groq Whisper Large V3 Turbo + Llama 3.3 70B Versatile

Rust handling everything: The entire LLM Polishing waterfall and the Supabase API fetch will be moved from App.tsx (the frontend) into src-tauri/src/lib.rs (the backend) so no API keys or STT/LLM network requests are visible to anyone inspecting the frontend.
16KHz & WebM Payload: The frontend configures getUserMedia for a 16000 sample rate and uses the native MediaRecorder to generate a compressed WebM (Opus) file. The VAD logic pauses/resumes this recorder to strip silence, and passes the final WebM to Rust. Rust then securely fetches the API key from Supabase and sends the audio directly to the Groq API.
1.5 seconds for VAD: The peak-amplitude VAD logic in FastBatch.ts will use a 1500ms (1.5 seconds) hangover window to ensure it doesn't accidentally cut off your mid-sentence pauses.