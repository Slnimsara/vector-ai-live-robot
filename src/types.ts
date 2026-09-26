export type Role = 'user' | 'model';

export type VibeType = 'hyped' | 'curious' | 'playful' | 'chill' | 'supportive';

export type BotState = 'idle' | 'listening' | 'thinking' | 'speaking';

export type LiveSessionStatus = 'disconnected' | 'connecting' | 'connected' | 'listening' | 'speaking';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  vibe?: VibeType;
  isStreaming?: boolean;
}

export type VoiceName = 'Zephyr' | 'Puck' | 'Kore' | 'Fenrir' | 'Charon';

export interface VoiceSettings {
  voice: VoiceName;
  autoSpeak: boolean;
  useGeminiTts: boolean;
  soundEffects: boolean;
  userName: string;
  speechRate: number; // 0.8 to 1.3
}

export interface ConversationStarter {
  id: string;
  label: string;
  emoji: string;
  prompt: string;
  category: 'fun' | 'deep' | 'casual' | 'hype';
}
