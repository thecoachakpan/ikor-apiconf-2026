export class UltraFastStream {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private accumulatedText = "";
  private onTranscriptionComplete: ((text: string) => void) | null = null;

  async start(apiKey: string, onTranscriptionComplete: (text: string) => void) {
    this.onTranscriptionComplete = onTranscriptionComplete;
    this.accumulatedText = "";

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    let wsEndpoint = "wss://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&smart_format=true&encoding=linear16&sample_rate=16000&channels=1";
    if (timezone.includes("Europe") || timezone.includes("Africa") || timezone.includes("MiddleEast")) {
      wsEndpoint = "wss://api.eu.deepgram.com/v1/listen?model=nova-2&punctuate=true&smart_format=true&encoding=linear16&sample_rate=16000&channels=1";
    } else if (timezone.includes("Asia") || timezone.includes("Australia") || timezone.includes("Pacific")) {
      wsEndpoint = "wss://api.ast.deepgram.com/v1/listen?model=nova-2&punctuate=true&smart_format=true&encoding=linear16&sample_rate=16000&channels=1";
    }

    this.ws = new WebSocket(wsEndpoint, ["token", apiKey]);

    this.ws.onmessage = (msgEvent) => {
      try {
        const data = JSON.parse(msgEvent.data);
        const chunkText = data.channel?.alternatives?.[0]?.transcript || "";
        if (data.is_final && chunkText) {
          this.accumulatedText += " " + chunkText;
        }
      } catch (e) {
        console.error("Error parsing Deepgram WS message:", e);
      }
    };

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true }
    });

    this.audioContext = new AudioContext({ sampleRate: 16000 });
    const source = this.audioContext.createMediaStreamSource(this.stream);
    
    this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.scriptProcessor.onaudioprocess = (e) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const channelData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(channelData.length);
        for (let i = 0; i < channelData.length; i++) {
          let s = Math.max(-1, Math.min(1, channelData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        this.ws.send(pcm16.buffer);
      }
    };

    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);
  }

  stop() {
    if (this.stream) this.stream.getTracks().forEach(track => track.stop());
    if (this.scriptProcessor) this.scriptProcessor.disconnect();
    if (this.audioContext) this.audioContext.close();
    
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "CloseStream" }));
      }
      
      // Wait a moment for final messages before invoking callback
      setTimeout(() => {
        if (this.ws) this.ws.close();
        if (this.onTranscriptionComplete) {
          this.onTranscriptionComplete(this.accumulatedText.trim());
        }
      }, 500);
    }
  }
}
