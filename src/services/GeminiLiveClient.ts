// Client-side manager for the persistent Gemini Live Audio session
import { eventBus } from './EventBus';

export type LiveCallState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private micProcessor: ScriptProcessorNode | null = null;
  
  private activeSources: AudioBufferSourceNode[] = [];
  private nextStartTime = 0;
  private state: LiveCallState = 'idle';
  private systemInstruction = '';

  // Callbacks for UI updates
  public onStateChange: (state: LiveCallState) => void = () => {};
  public onUserTranscript: (text: string) => void = () => {};
  public onModelTranscript: (text: string) => void = () => {};
  public onError: (err: string) => void = () => {};

  constructor(systemInstruction: string) {
    this.systemInstruction = systemInstruction;
  }

  public async startCall() {
    if (this.state !== 'idle') return;

    this.transitionState('connecting');

    try {
      // 1. Get User Microphone Permission and setup Input/Output Audio Contexts
      this.micStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Browser constraints: we want 16000Hz input and 24000Hz output
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioCtx = new AudioCtx({ sampleRate: 16000 });
      this.outputAudioCtx = new AudioCtx({ sampleRate: 24000 });

      // Create WebSocket URL securely
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live-ws`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[GeminiLiveClient] WebSocket bridge opened, starting session...');
        // Send the initial start message with configuration / system prompt
        this.ws?.send(JSON.stringify({
          type: 'start',
          systemInstruction: this.systemInstruction
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'status') {
            console.log('[GeminiLiveClient] Server status update:', msg.value);
            if (msg.value === 'connected') {
              this.transitionState('listening');
              this.startStreamingMic();
            } else if (msg.value === 'error') {
              this.handleError(msg.error || 'Connection error');
            } else if (msg.value === 'connecting') {
              this.transitionState('connecting');
            }
          } 
          
          else if (msg.type === 'audio') {
            // Received 24kHz audio from Gemini Live!
            this.transitionState('speaking');
            const float32Data = this.base64ToFloat32(msg.data);
            this.playAudioChunk(float32Data);
          } 
          
          else if (msg.type === 'interrupted') {
            // User interrupted Gemini (barge-in support)
            this.handleInterruption();
            this.transitionState('listening');
          } 
          
          else if (msg.type === 'user-transcript') {
            // User speech transcribed in real-time
            if (msg.text?.trim()) {
              this.onUserTranscript(msg.text);
            }
          } 
          
          else if (msg.type === 'model-transcript') {
            // Gemini speech transcribed in real-time
            if (msg.text?.trim()) {
              this.onModelTranscript(msg.text);
            }
          } 
          
          else if (msg.type === 'turn-complete') {
            // Gemini finished speaking, wait for user response
            this.transitionState('listening');
          }
        } catch (parseErr) {
          console.error('[GeminiLiveClient] Error parsing server message:', parseErr);
        }
      };

      this.ws.onerror = (err) => {
        console.error('[GeminiLiveClient] WebSocket error:', err);
        this.handleError('WebSocket connection error');
      };

      this.ws.onclose = (ev) => {
        console.log('[GeminiLiveClient] WebSocket connection closed:', ev.reason);
        if (this.state !== 'idle') {
          this.endCall();
        }
      };

    } catch (err: any) {
      console.error('[GeminiLiveClient] Failed to initialize call:', err);
      this.handleError(err.message || 'Microphone access denied or connection failed.');
    }
  }

  private startStreamingMic() {
    if (!this.inputAudioCtx || !this.micStream || !this.ws) return;

    try {
      this.micSource = this.inputAudioCtx.createMediaStreamSource(this.micStream);
      // script processor to buffer and process audio in 4096 sample chunks
      this.micProcessor = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);

      this.micSource.connect(this.micProcessor);
      this.micProcessor.connect(this.inputAudioCtx.destination);

      this.micProcessor.onaudioprocess = (e) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const float32PCM = e.inputBuffer.getChannelData(0);
        
        // 1. Calculate audio level for lip sync / microphone UI animations
        let sum = 0;
        for (let i = 0; i < float32PCM.length; i++) {
          sum += float32PCM[i] * float32PCM[i];
        }
        const rms = Math.sqrt(sum / float32PCM.length);
        // Publish mic volume event to animate UI pulse and characters if listening
        if (rms > 0.01) {
          eventBus.publish('audio:level', rms);
        }

        // 2. Convert and stream Int16 PCM to the server
        const int16PCM = this.float32ToInt16(float32PCM);
        const base64PCM = this.arrayBufferToBase64(int16PCM.buffer);

        this.ws.send(JSON.stringify({
          type: 'audio',
          data: base64PCM
        }));
      };

      console.log('[GeminiLiveClient] Microphone streaming started at 16kHz PCM.');
    } catch (err) {
      console.error('[GeminiLiveClient] Error setup microphone processing stream:', err);
    }
  }

  private playAudioChunk(pcmFloat32: Float32Array) {
    if (!this.outputAudioCtx) return;

    if (this.outputAudioCtx.state === 'suspended') {
      this.outputAudioCtx.resume();
    }

    const audioBuffer = this.outputAudioCtx.createBuffer(1, pcmFloat32.length, 24000);
    audioBuffer.getChannelData(0).set(pcmFloat32);

    const source = this.outputAudioCtx.createBufferSource();
    source.buffer = audioBuffer;
    
    // Connect to output destination
    source.connect(this.outputAudioCtx.destination);

    // Analyze volume levels of model's playing chunks for lip sync mouth animation!
    // We can do this with an AnalyserNode or by analyzing Float32 PCM directly.
    // Let's hook up a simple analysis: publish lip sync volume to eventBus!
    let sum = 0;
    for (let i = 0; i < pcmFloat32.length; i++) {
      sum += pcmFloat32[i] * pcmFloat32[i];
    }
    const rms = Math.sqrt(sum / pcmFloat32.length);
    if (rms > 0.005) {
      // Publish lip-sync event so Airi moves her mouth!
      eventBus.publish('lip-sync:update', Math.min(1.0, rms * 15));
    }

    const currentTime = this.outputAudioCtx.currentTime;
    let startTime = this.nextStartTime;

    if (startTime < currentTime) {
      // If we fell behind, schedule immediately (with 50ms buffer)
      startTime = currentTime + 0.05;
    }

    source.start(startTime);
    this.activeSources.push(source);

    source.onended = () => {
      this.activeSources = this.activeSources.filter(s => s !== source);
      // When playing ends and there is no more audio scheduled, update lip sync to zero
      if (this.activeSources.length === 0) {
        eventBus.publish('lip-sync:update', 0);
      }
    };

    this.nextStartTime = startTime + audioBuffer.duration;
  }

  private handleInterruption() {
    console.log('[GeminiLiveClient] Interruption received! Stopping all playing audio nodes...');
    this.activeSources.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // already stopped
      }
    });
    this.activeSources = [];
    this.nextStartTime = 0;
    eventBus.publish('lip-sync:update', 0);
  }

  public endCall() {
    console.log('[GeminiLiveClient] Ending Live session...');
    this.transitionState('idle');

    // 1. Close WebSocket
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }

    // 2. Stop microphone track
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }

    // 3. Disconnect nodes
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    if (this.micProcessor) {
      this.micProcessor.disconnect();
      this.micProcessor = null;
    }

    // 4. Stop all playing audio buffers
    this.handleInterruption();

    // 5. Close audio contexts
    if (this.inputAudioCtx) {
      this.inputAudioCtx.close();
      this.inputAudioCtx = null;
    }
    if (this.outputAudioCtx) {
      this.outputAudioCtx.close();
      this.outputAudioCtx = null;
    }

    eventBus.publish('audio:level', 0);
    eventBus.publish('lip-sync:update', 0);
  }

  private transitionState(newState: LiveCallState) {
    if (this.state === newState) return;
    this.state = newState;
    this.onStateChange(newState);
  }

  private handleError(errorMsg: string) {
    this.transitionState('error');
    this.onError(errorMsg);
    this.endCall();
  }

  // Float32 Float32Array [-1.0, 1.0] -> Int16 Int16Array [-32768, 32767]
  private float32ToInt16(float32Array: Float32Array): Int16Array {
    const l = float32Array.length;
    const buf = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      buf[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return buf;
  }

  // Base64 -> Float32Array for playback
  private base64ToFloat32(base64: string): Float32Array {
    const binary = atob(base64);
    const len = binary.length;
    const buffer = new ArrayBuffer(len);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < len; i++) {
      view[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }
    return float32;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  public getState(): LiveCallState {
    return this.state;
  }
}
