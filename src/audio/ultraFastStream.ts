import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";

export interface PipelineResult {
  text: string;
  rawAsrText: string | null;
  telemetry: {
    payloadSizeKb: number;
    asrTimeMs: number;
    llmTimeMs: number;
    modelUsed: string;
  } | null;
}

export interface UltraFastOptions {
  deviceId?: string;
  isDictation?: boolean;
  customTerms?: string | null;
  customShortcuts?: string | null;
  contextAwareness?: boolean;
  splitPipeline?: boolean;
  onAsrComplete?: (rawText: string) => Promise<void>;
}

export class UltraFastStream {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private accumulatedText = "";
  private onTranscriptionComplete: ((result: PipelineResult | string) => void) | null = null;
  private windowContext: string | null = null;
  private isDictation = true;
  private customTerms: string | null = null;
  private customShortcuts: string | null = null;
  private contextAwareness = true;
  private splitPipeline = false;
  private onAsrComplete: ((rawText: string) => Promise<void>) | null = null;
  private startTime = 0;
  private totalAudioBytes = 0;

  async start(
    onTranscriptionComplete: (result: PipelineResult | string) => void,
    windowContext?: string | null,
    options?: UltraFastOptions
  ) {
    this.onTranscriptionComplete = onTranscriptionComplete;
    this.windowContext = windowContext || null;
    this.accumulatedText = "";
    this.totalAudioBytes = 0;
    this.startTime = performance.now();

    if (options) {
      if (options.isDictation !== undefined) this.isDictation = options.isDictation;
      if (options.customTerms !== undefined) this.customTerms = options.customTerms;
      if (options.customShortcuts !== undefined) this.customShortcuts = options.customShortcuts;
      if (options.contextAwareness !== undefined) this.contextAwareness = options.contextAwareness;
      if (options.splitPipeline !== undefined) this.splitPipeline = options.splitPipeline;
      if (options.onAsrComplete) this.onAsrComplete = options.onAsrComplete;
    }

    // 1. Fetch Deepgram API key from Supabase dynamically
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://njjcvlmjhnjycdogxszl.supabase.co";
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_-EeRA4ECq2CR3K6E052Z9Q_9-QBRPMk";

    let deepgramKey = "";
    try {
      deepgramKey = await invoke<string>("fetch_deepgram_key", { supabaseUrl, supabaseAnonKey });
    } catch (err) {
      console.error("UltraFastStream: Failed to fetch Deepgram key from Supabase:", err);
      throw new Error("Unable to fetch Deepgram API key from Supabase.");
    }

    // 2. Build Deepgram Nova-3 WebSocket URL
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    let wsEndpoint = "wss://api.deepgram.com/v1/listen?model=nova-3&punctuate=true&smart_format=true&encoding=linear16&sample_rate=16000&channels=1";
    if (timezone.includes("Europe") || timezone.includes("Africa") || timezone.includes("MiddleEast")) {
      wsEndpoint = "wss://api.eu.deepgram.com/v1/listen?model=nova-3&punctuate=true&smart_format=true&encoding=linear16&sample_rate=16000&channels=1";
    } else if (timezone.includes("Asia") || timezone.includes("Australia") || timezone.includes("Pacific")) {
      wsEndpoint = "wss://api.ast.deepgram.com/v1/listen?model=nova-3&punctuate=true&smart_format=true&encoding=linear16&sample_rate=16000&channels=1";
    }

    this.ws = new WebSocket(wsEndpoint, ["token", deepgramKey]);

    this.ws.onmessage = (msgEvent) => {
      try {
        const data = JSON.parse(msgEvent.data);
        const chunkText = data.channel?.alternatives?.[0]?.transcript || "";
        if (data.is_final && chunkText) {
          this.accumulatedText += (this.accumulatedText ? " " : "") + chunkText.trim();
        }
      } catch (e) {
        console.error("Error parsing Deepgram WS message:", e);
      }
    };

    this.ws.onerror = (e) => {
      console.error("UltraFastStream WebSocket error:", e);
    };

    // 3. Setup Mic Stream & AudioContext at 16kHz
    const constraints: MediaStreamConstraints = {
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        ...(options?.deviceId && options.deviceId !== "system-default" ? { deviceId: { exact: options.deviceId } } : {})
      }
    };

    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    const source = this.audioContext.createMediaStreamSource(this.stream);

    this.scriptProcessor = this.audioContext.createScriptProcessor(2048, 1, 1);
    this.scriptProcessor.onaudioprocess = (e) => {
      const channelData = e.inputBuffer.getChannelData(0);

      // Calculate RMS volume for visualizer animation
      let sum = 0;
      for (let i = 0; i < channelData.length; i++) {
        sum += channelData[i] * channelData[i];
      }
      const rms = Math.sqrt(sum / channelData.length);
      const volume = Math.min(100, Math.max(0, rms * 500));
      emit("mic_volume_update", volume).catch(() => {});

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const pcm16 = new Int16Array(channelData.length);
        for (let i = 0; i < channelData.length; i++) {
          let s = Math.max(-1, Math.min(1, channelData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        this.totalAudioBytes += pcm16.byteLength;
        this.ws.send(pcm16.buffer);
      }
    };

    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);
  }

  async stop() {
    emit("mic_volume_update", 0).catch(() => {});
    const asrEndTime = performance.now();
    const asrTimeMs = Math.round(asrEndTime - this.startTime);

    if (this.stream) this.stream.getTracks().forEach(track => track.stop());
    if (this.scriptProcessor) this.scriptProcessor.disconnect();
    if (this.audioContext) this.audioContext.close();

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "CloseStream" }));
      }
    }

    // Wait 400ms for final Deepgram STT frame
    await new Promise(res => setTimeout(res, 400));
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
    }

    let rawAsrText = this.accumulatedText.trim();
    let asrModelUsed = "Deepgram Nova-3";
    console.log("⚡ Ultrafast [Deepgram Nova-3 STT Raw]:", rawAsrText);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://njjcvlmjhnjycdogxszl.supabase.co";
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_-EeRA4ECq2CR3K6E052Z9Q_9-QBRPMk";
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

    // ⚡ ASR Fallback: If Deepgram Nova-3 fails, returns empty text, or errors out -> Fallback to Groq Whisper V3 Turbo
    if (!rawAsrText) {
      console.warn("UltraFastStream: Deepgram Nova-3 produced no transcript or failed. Triggering Groq Whisper ASR fallback...");
      try {
        const groqKey = await invoke<string>("fetch_groq_key", { supabaseUrl, supabaseAnonKey });
        if (groqKey) {
          rawAsrText = await invoke<string>("transcribe_groq_cloud", {
            apiKey: groqKey,
            base64Wav: "",
            customTerms: this.customTerms
          });
          if (rawAsrText && rawAsrText.trim()) {
            asrModelUsed = "Groq Whisper V3 Turbo (Fallback)";
            console.log("⚡ Ultrafast [Groq Whisper ASR Fallback Raw]:", rawAsrText);
          }
        }
      } catch (fallbackAsrErr) {
        console.warn("UltraFastStream: Groq Whisper ASR fallback also failed:", fallbackAsrErr);
      }
    }

    if (!rawAsrText || !rawAsrText.trim()) {
      if (this.onTranscriptionComplete) {
        this.onTranscriptionComplete({ text: "", rawAsrText: null, telemetry: null });
      }
      return;
    }

    // If split pipeline (Scribe Mode Phase 1), trigger ASR complete callback immediately
    if (this.splitPipeline && this.onAsrComplete) {
      try {
        await this.onAsrComplete(rawAsrText);
      } catch (err) {
        console.warn("UltraFastStream: onAsrComplete callback error:", err);
      }
    }

    // 4. Polish with Groq (gpt-oss-120b) ➔ Gemini (gemini-2.5-flash-lite) LLM Fallback
    const llmStartTime = performance.now();

    let polishedText = rawAsrText;
    let modelUsed = `${asrModelUsed} + Raw`;

    let activeContext = this.windowContext;
    if (!activeContext && this.contextAwareness) {
      try {
        activeContext = await invoke<string>("get_window_context_optimized", { needsFullPage: false });
      } catch (e) {
        console.warn("UltraFastStream: Failed to fetch window context:", e);
      }
    }

    try {
      const groqKey = await invoke<string>("fetch_groq_key", { supabaseUrl, supabaseAnonKey });
      polishedText = await invoke<string>("polish_with_llm_fallback", {
        groqApiKey: groqKey || null,
        geminiApiKey: geminiKey || null,
        rawText: rawAsrText,
        windowContext: activeContext,
        isDictation: this.isDictation,
        customTerms: this.customTerms,
        customShortcuts: this.customShortcuts
      });
      modelUsed = `${asrModelUsed} + LLM (gpt-oss-120b / Gemini Fallback)`;
    } catch (llmErr) {
      console.warn("UltraFastStream: LLM polishing failed, using raw ASR text:", llmErr);
    }

    const llmTimeMs = Math.round(performance.now() - llmStartTime);
    const payloadSizeKb = Math.round((this.totalAudioBytes / 1024) * 10) / 10;

    const result: PipelineResult = {
      text: polishedText,
      rawAsrText,
      telemetry: {
        payloadSizeKb,
        asrTimeMs,
        llmTimeMs,
        modelUsed
      }
    };

    if (this.onTranscriptionComplete) {
      this.onTranscriptionComplete(result);
    }
  }
}
