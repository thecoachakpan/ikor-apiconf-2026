import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";

/**
 * QueuedLocal: Dedicated audio module for the "queued" (local priority) speed mode.
 * 
 * Architecture:
 * - Direct native Rust recording and VAD.
 * - Accumulates resampled, speech-filtered samples directly in WhisperAppState.
 * - On stop, tells the backend to perform local inference and return text.
 */
export class QueuedLocal {
  private onTranscriptionComplete: ((text: string) => void) | null = null;
  private isRecording = false;
  private windowContext: string | null = null;
  private options: any = null;

  async start(
    onTranscriptionComplete: (text: string) => void,
    windowContext: string | null = null,
    options?: {
      splitPipeline?: boolean;
      deviceId?: string;
      isDictation?: boolean;
      customTerms?: string | null;
      customShortcuts?: string | null;
      contextAwareness?: boolean;
      onAsrComplete?: (rawText: string) => Promise<void>;
    }
  ) {
    this.onTranscriptionComplete = onTranscriptionComplete;
    this.windowContext = windowContext;
    this.options = options;
    this.isRecording = true;

    try {
      console.log("Queued mode: Initializing native Rust whisper stream...");
      await invoke("init_whisper_stream");
      console.log("Native Whisper stream is ready.");
    } catch (bootErr) {
      console.error("Failed to boot native Whisper stream:", bootErr);
    }

    const deviceId = options?.deviceId || "system-default";
    console.log("Queued mode: Starting native recording on device:", deviceId);
    try {
      await invoke("start_native_recording", { deviceId });
    } catch (e) {
      console.error("QueuedLocal: Failed to start native recording:", e);
      throw e;
    }
  }

  async stop() {
    if (!this.isRecording) return;
    this.isRecording = false;

    console.log("QueuedLocal: Stopping native recording...");
    try {
      await invoke("stop_native_recording");
    } catch (e) {
      console.error("QueuedLocal: Failed to stop native recording:", e);
    }

    // Complete the stream and get native inference text
    try {
      console.time("Native Whisper Transcription Wait");
      const customTerms = (this.options?.contextAwareness !== false) ? (this.options?.customTerms || null) : null;
      const windowContext = (this.options?.contextAwareness !== false) ? (this.windowContext || null) : null;

      const rawText = await invoke<string>("finish_audio_stream", {
        customTerms,
        windowContext
      });
      console.timeEnd("Native Whisper Transcription Wait");
      console.log("QueuedLocal Native Text:", rawText);

      // Perform local client-side shortcut expansion
      let finalWords = rawText;
      try {
        const store = await load("store.json");
        const shortcuts = await store.get("sayikor_text_shortcuts") as { original: string, replacement: string }[];
        if (shortcuts && shortcuts.length > 0) {
          for (const shortcut of shortcuts) {
            if (!shortcut.original || !shortcut.replacement) continue;
            const escaped = shortcut.original.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(`(?<=\\b|^)${escaped}(?=\\b|$)`, 'gi');
            finalWords = finalWords.replace(regex, shortcut.replacement);
          }
        }
      } catch (err) {
        console.warn("Failed to load/apply text shortcuts in offline mode:", err);
      }

      // If in split scribe mode, trigger phase 1 (ASR completion)
      if (this.options?.splitPipeline && this.options?.onAsrComplete) {
        await this.options.onAsrComplete(finalWords);
      }

      if (this.onTranscriptionComplete) {
        this.onTranscriptionComplete(finalWords);
      }
    } catch (e) {
      console.error("QueuedLocal native transcription failed:", e);
      if (this.onTranscriptionComplete) this.onTranscriptionComplete("");
    }
  }
}
