import { invoke } from "@tauri-apps/api/core";

export interface TelemetryData {
  payloadSizeKb: number;
  asrTimeMs: number;
  llmTimeMs: number;
  modelUsed: string;
}

export interface PipelineResult {
  text: string;
  rawAsrText: string | null;
  telemetry: TelemetryData | null;
}

export class FastBatch {
  private onTranscriptionComplete: ((result: PipelineResult) => void) | null = null;
  private isRecording = false;
  private splitPipeline = false;
  private onAsrComplete: ((rawText: string) => void) | null = null;
  private isDictation = true;
  private customTerms: string | null = null;
  private customShortcuts: string | null = null;
  private contextAwareness = true;
  private windowContext: string | null = null;

  async start(
    onTranscriptionComplete: (result: PipelineResult) => void, 
    _windowContext: string | null = null,
    options?: { 
      splitPipeline?: boolean; 
      onAsrComplete?: (rawText: string) => void; 
      deviceId?: string;
      isDictation?: boolean;
      customTerms?: string | null;
      customShortcuts?: string | null;
      contextAwareness?: boolean;
    }
  ) {
    this.onTranscriptionComplete = onTranscriptionComplete;
    this.splitPipeline = options?.splitPipeline ?? false;
    this.onAsrComplete = options?.onAsrComplete ?? null;
    this.isDictation = options?.isDictation ?? true;
    this.customTerms = options?.customTerms ?? null;
    this.customShortcuts = options?.customShortcuts ?? null;
    this.contextAwareness = options?.contextAwareness ?? true;
    this.windowContext = _windowContext;
    this.isRecording = true;

    const deviceId = options?.deviceId || "system-default";
    console.log("FastBatch: Starting native recording on device:", deviceId);

    try {
      await invoke("start_native_recording", { deviceId });
    } catch (e) {
      console.error("FastBatch: Failed to start native recording:", e);
      throw e;
    }
  }

  async stop() {
    if (!this.isRecording) return;
    this.isRecording = false;

    console.log("FastBatch: Stopping native recording...");
    try {
      await invoke("stop_native_recording");
    } catch (e) {
      console.error("FastBatch: Failed to stop native recording:", e);
    }

    if (!navigator.onLine) {
      console.log("FastBatch: Offline, skipping cloud pipeline.");
      if (this.onTranscriptionComplete) {
        this.onTranscriptionComplete({ text: "", rawAsrText: null, telemetry: null });
      }
      return;
    }

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://njjcvlmjhnjycdogxszl.supabase.co";
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_-EeRA4ECq2CR3K6E052Z9Q_9-QBRPMk";
      const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

      let activeContext = this.windowContext;
      if (!activeContext) {
        try {
          activeContext = this.contextAwareness ? await invoke<string>("get_window_context_optimized", { needsFullPage: false }) : "";
        } catch (e) {
          console.warn("FastBatch: Failed to get optimized context:", e);
        }
      }

      if (this.splitPipeline) {
        // ── Split Pipeline (Scribe Mode): ASR → callback → LLM → final callback ──
        console.log("FastBatch [Split]: Executing split pipeline...");

        // Step 1: Fetch Groq API key
        let groqKey = "";
        try {
          groqKey = await invoke<string>("fetch_groq_key", { supabaseUrl, supabaseAnonKey });
        } catch (e) {
          console.warn("FastBatch [Split]: Failed to fetch Groq key, falling back to unified pipeline.", e);
        }

        if (!groqKey) {
          // Fallback: use unified pipeline (no two-phase display)
          const result = await invoke<PipelineResult>("process_audio_pipeline", {
            base64Wav: "", // Backend will resolve from NativeRecorderState
            supabaseUrl,
            supabaseAnonKey,
            geminiKey,
            windowContext: activeContext,
            isDictation: this.isDictation,
            customTerms: this.customTerms,
            customShortcuts: this.customShortcuts
          });
          if (this.onTranscriptionComplete) this.onTranscriptionComplete(result);
          return;
        }

        // Step 2: ASR (Phase 1)
        const asrStart = performance.now();
        let rawText = "";
        let asrModel = "Groq Whisper V3 Turbo";

        try {
          rawText = await invoke<string>("transcribe_groq_cloud", { 
            apiKey: groqKey, 
            base64Wav: "", // Backend will resolve from NativeRecorderState
            customTerms: this.customTerms 
          });
        } catch (e) {
          console.warn("FastBatch: Groq ASR failed/timed out after handshake. Falling back to Local Native Whisper...", e);
          try {
            rawText = await invoke<string>("finish_audio_stream", {
              customTerms: this.customTerms,
              windowContext: activeContext
            });
            if (rawText && rawText.trim()) {
              asrModel = "Local Native Whisper (Fallback)";
            }
          } catch (nativeErr) {
            console.error("FastBatch: Local Native Whisper fallback also failed:", nativeErr);
          }
        }
        const asrTimeMs = performance.now() - asrStart;

        if (!rawText || !rawText.trim()) {
          console.log("FastBatch [Split]: No ASR text, skipping.");
          if (this.onTranscriptionComplete) {
            this.onTranscriptionComplete({ text: "", rawAsrText: null, telemetry: null });
          }
          return;
        }

        // Fire intermediate callback — shows raw text in approval panel
        if (this.onAsrComplete) {
          this.onAsrComplete(rawText);
        }

        // Step 3: LLM Polishing (Phase 2)
        const llmStart = performance.now();
        let polishedText = rawText;
        let modelUsed = `${asrModel} (Raw)`;

        try {
          polishedText = await invoke<string>("polish_with_llm_fallback", {
            groqApiKey: groqKey || null,
            geminiApiKey: geminiKey || null,
            rawText,
            windowContext: activeContext,
            isDictation: this.isDictation,
            customTerms: this.customTerms,
            customShortcuts: this.customShortcuts
          });
          modelUsed = `${asrModel} + LLM (gpt-oss-120b / Gemini Fallback)`;
        } catch (e) {
          console.warn("FastBatch [Split]: LLM polishing failed, using raw ASR text:", e);
        }
        const llmTimeMs = performance.now() - llmStart;

        if (this.onTranscriptionComplete) {
          this.onTranscriptionComplete({
            text: polishedText,
            rawAsrText: rawText,
            telemetry: {
              payloadSizeKb: 0, // Will be updated by backend or fallback
              asrTimeMs,
              llmTimeMs,
              modelUsed
            }
          });
        }
      } else {
        // ── Unified Pipeline (Dictation Mode): single process_audio_pipeline call ──
        console.log("FastBatch: Sending to secure Rust pipeline...");

        const result = await invoke<PipelineResult>("process_audio_pipeline", {
          base64Wav: "", // Backend will resolve from NativeRecorderState
          supabaseUrl,
          supabaseAnonKey,
          geminiKey,
          windowContext: activeContext,
          isDictation: this.isDictation,
          customTerms: this.customTerms,
          customShortcuts: this.customShortcuts
        });

        if (this.onTranscriptionComplete) {
          this.onTranscriptionComplete(result);
        }
      }
    } catch (e) {
      console.error("FastBatch processing failed:", e);
      if (this.onTranscriptionComplete) {
        this.onTranscriptionComplete({ text: "", rawAsrText: null, telemetry: null });
      }
    }
  }


}
