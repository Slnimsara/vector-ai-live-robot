// Web Audio Context singleton for UI effects and general playback
let audioContext: AudioContext | null = null;
let currentSourceNode: AudioBufferSourceNode | null = null;

export function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    audioContext = new AudioCtx();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

// Convert Float32Array PCM into 16-bit PCM base64 string
export function pcmFloat32ToBase64(float32Array: Float32Array): string {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

// Stop currently playing PCM audio or speech synthesis
export function stopAllSpeech(): void {
  try {
    if (currentSourceNode) {
      currentSourceNode.stop();
      currentSourceNode.disconnect();
      currentSourceNode = null;
    }
  } catch (e) {
    // Ignore already stopped
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Play raw 24kHz 16-bit PCM returned by Gemini TTS
export async function playPcmAudio(
  base64Data: string,
  sampleRate: number = 24000,
  onEnded?: () => void
): Promise<AudioBufferSourceNode | null> {
  stopAllSpeech();

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert 16-bit PCM to Float32
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    const audioBuffer = ctx.createBuffer(1, float32Array.length, sampleRate);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    currentSourceNode = source;

    source.onended = () => {
      if (currentSourceNode === source) {
        currentSourceNode = null;
      }
      onEnded?.();
    };

    source.start();
    return source;
  } catch (err) {
    console.warn('Failed to play PCM audio via Web Audio:', err);
    onEnded?.();
    return null;
  }
}

// Browser Web Speech API fallback
export function speakWithBrowser(
  text: string,
  rate: number = 1.0,
  onEnd?: () => void
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return;
  }

  stopAllSpeech();

  const clean = text
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      ''
    )
    .replace(/\*+/g, '')
    .trim();

  if (!clean) {
    onEnd?.();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = Math.min(1.4, Math.max(0.7, rate));
  utterance.pitch = 1.1;

  const voices = window.speechSynthesis.getVoices();
  const englishVoices = voices.filter((v) => v.lang.startsWith('en'));
  const preferredVoice =
    englishVoices.find(
      (v) =>
        v.name.includes('Natural') ||
        v.name.includes('Samantha') ||
        v.name.includes('Google UK English Female') ||
        v.name.includes('Victoria') ||
        v.name.includes('Karen') ||
        v.name.includes('Zira')
    ) || englishVoices[0];

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();

  window.speechSynthesis.speak(utterance);
}

// Subtle UI sound effects synthesized via Web Audio oscillators
export function playSoundEffect(type: 'send' | 'receive' | 'mic-on' | 'mic-off' | 'pop'): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (type) {
      case 'send': {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }
      case 'receive': {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.setValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.23);
        break;
      }
      case 'mic-on': {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.1);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.16);
        break;
      }
      case 'mic-off': {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(783.99, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }
      case 'pop': {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.07);
        break;
      }
    }
  } catch (e) {
    // Audio context not allowed or not ready
  }
}

/**
 * Gemini Live API Client (gemini-3.8-live)
 * Manages bidirectional WebSocket audio and video streaming between client and model.
 */
export interface LiveSessionCallbacks {
  onStatusChange: (status: 'disconnected' | 'connecting' | 'connected' | 'listening' | 'speaking') => void;
  onTranscript: (text: string, isModel: boolean) => void;
  onInterrupted: () => void;
  onError: (err: string) => void;
  onAudioLevel?: (level: number, type: 'input' | 'output') => void;
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private nextPlayTime: number = 0;
  private activeAudioSources: AudioBufferSourceNode[] = [];
  private callbacks: LiveSessionCallbacks;
  private isMuted: boolean = false;
  private voiceName: string = 'Zephyr';
  private userName: string = '';
  private animFrameId: number | null = null;

  constructor(callbacks: LiveSessionCallbacks) {
    this.callbacks = callbacks;
  }

  async start(voiceName: string = 'Zephyr', userName: string = '') {
    this.voiceName = voiceName;
    this.userName = userName;
    this.callbacks.onStatusChange('connecting');

    try {
      // 1. Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 2. Setup AudioContexts (16kHz for input mic capture, 24kHz for output model speech)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioCtx = new AudioCtx({ sampleRate: 16000 });
      this.outputAudioCtx = new AudioCtx({ sampleRate: 24000 });

      if (this.inputAudioCtx.state === 'suspended') {
        await this.inputAudioCtx.resume();
      }
      if (this.outputAudioCtx.state === 'suspended') {
        await this.outputAudioCtx.resume();
      }

      // Setup output analyser for real-time speech visualizer reactions
      this.outputAnalyser = this.outputAudioCtx.createAnalyser();
      this.outputAnalyser.fftSize = 256;
      this.outputAnalyser.smoothingTimeConstant = 0.5;
      this.outputAnalyser.connect(this.outputAudioCtx.destination);

      this.startAnalyserLoop();

      // 3. Connect WebSocket to /live
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const params = new URLSearchParams();
      if (voiceName) params.set('voice', voiceName);
      if (userName) params.set('userName', userName);

      const wsUrl = `${protocol}//${host}/live?${params.toString()}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Gemini Live WebSocket open');
        this.callbacks.onStatusChange('connected');
        this.startMicrophoneStream();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'ready') {
            this.callbacks.onStatusChange('listening');
          } else if (msg.type === 'audio' && msg.audio) {
            this.callbacks.onStatusChange('speaking');
            this.scheduleAudioChunk(msg.audio);
          } else if (msg.type === 'text' && msg.text) {
            this.callbacks.onTranscript(msg.text, true);
          } else if (msg.type === 'interrupted') {
            this.stopPlayback();
            this.callbacks.onInterrupted();
            this.callbacks.onStatusChange('listening');
          } else if (msg.type === 'turnComplete') {
            if (this.activeAudioSources.length === 0) {
              this.callbacks.onStatusChange('listening');
            }
          } else if (msg.type === 'error') {
            this.callbacks.onError(msg.message || 'Error from Live session');
          }
        } catch (e) {
          console.warn('Error parsing Live message:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.error('Gemini Live WebSocket error:', err);
        this.callbacks.onError('WebSocket connection failed');
        this.stop();
      };

      this.ws.onclose = () => {
        console.log('Gemini Live WebSocket closed');
        this.callbacks.onStatusChange('disconnected');
        this.stopPlayback();
      };
    } catch (err: any) {
      console.error('Failed to start Gemini Live session:', err);
      this.callbacks.onError(err?.message || 'Microphone or connection failed');
      this.callbacks.onStatusChange('disconnected');
    }
  }

  private startAnalyserLoop() {
    const dataArray = new Uint8Array(128);
    const checkAmplitude = () => {
      if (this.outputAnalyser && this.activeAudioSources.length > 0) {
        this.outputAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / (dataArray.length * 255);
        this.callbacks.onAudioLevel?.(avg, 'output');
      }
      this.animFrameId = requestAnimationFrame(checkAmplitude);
    };
    this.animFrameId = requestAnimationFrame(checkAmplitude);
  }

  private startMicrophoneStream() {
    if (!this.inputAudioCtx || !this.mediaStream) return;

    try {
      const source = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);
      const processor = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (this.isMuted) return;
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const channelData = e.inputBuffer.getChannelData(0);

        // Calculate input mic level for responsive eyes
        let sum = 0;
        for (let i = 0; i < channelData.length; i++) {
          sum += channelData[i] * channelData[i];
        }
        const rms = Math.sqrt(sum / channelData.length);
        this.callbacks.onAudioLevel?.(Math.min(1, rms * 6), 'input');

        const base64Audio = pcmFloat32ToBase64(channelData);
        this.ws.send(JSON.stringify({ audio: base64Audio }));
      };

      source.connect(processor);
      processor.connect(this.inputAudioCtx.destination);
      this.processor = processor;
    } catch (e) {
      console.warn('Microphone processor error:', e);
    }
  }

  private scheduleAudioChunk(base64Data: string) {
    if (!this.outputAudioCtx || !this.outputAnalyser) return;

    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const buffer = this.outputAudioCtx.createBuffer(1, float32Array.length, 24000);
      buffer.getChannelData(0).set(float32Array);

      const source = this.outputAudioCtx.createBufferSource();
      source.buffer = buffer;
      // Connect to analyser which connects to destination
      source.connect(this.outputAnalyser);

      const now = this.outputAudioCtx.currentTime;
      if (this.nextPlayTime < now) {
        this.nextPlayTime = now;
      }

      source.start(this.nextPlayTime);
      this.nextPlayTime += buffer.duration;

      this.activeAudioSources.push(source);

      source.onended = () => {
        const idx = this.activeAudioSources.indexOf(source);
        if (idx !== -1) {
          this.activeAudioSources.splice(idx, 1);
        }
        if (this.activeAudioSources.length === 0) {
          this.callbacks.onStatusChange('listening');
        }
      };
    } catch (err) {
      console.warn('Failed to decode Live audio chunk:', err);
    }
  }

  sendVideoFrame(base64Jpeg: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ video: base64Jpeg }));
    }
  }

  sendText(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.callbacks.onTranscript(text, false);
      this.ws.send(JSON.stringify({ text }));
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  stopPlayback() {
    this.activeAudioSources.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch (e) {}
    });
    this.activeAudioSources = [];
    if (this.outputAudioCtx) {
      this.nextPlayTime = this.outputAudioCtx.currentTime;
    }
  }

  stop() {
    this.stopPlayback();

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch (e) {}
      this.processor = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    if (this.inputAudioCtx && this.inputAudioCtx.state !== 'closed') {
      try {
        this.inputAudioCtx.close();
      } catch (e) {}
      this.inputAudioCtx = null;
    }

    if (this.outputAudioCtx && this.outputAudioCtx.state !== 'closed') {
      try {
        this.outputAudioCtx.close();
      } catch (e) {}
      this.outputAudioCtx = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }

    this.callbacks.onStatusChange('disconnected');
  }
}
