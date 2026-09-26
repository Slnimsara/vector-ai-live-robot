import React from 'react';
import { BotState, VibeType, VoiceSettings } from '../types';
import {
  Radio,
  MessageSquare,
  Settings,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface HeaderProps {
  currentView: 'voice' | 'chat';
  botState: BotState;
  vibe: VibeType;
  voiceSettings: VoiceSettings;
  isAudioPlaying: boolean;
  onViewChange: (view: 'voice' | 'chat') => void;
  onOpenSettings: () => void;
  onClearChat: () => void;
  onToggleAutoSpeak: () => void;
  onStopAudio: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  botState,
  voiceSettings,
  isAudioPlaying,
  onViewChange,
  onOpenSettings,
  onClearChat,
  onToggleAutoSpeak,
  onStopAudio,
}) => {
  return (
    <header className="w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
      {/* Brand & Bot Status */}
      <div className="flex items-center gap-3">
        <div className="relative">
          {/* Miniature Vector Eyes Icon */}
          <div className="w-9 h-9 rounded-xl bg-slate-900 border border-teal-500/30 flex items-center justify-center gap-1 shadow-md shadow-teal-500/10">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#5EEAD4] shadow-[0_0_6px_#5EEAD4]" />
            <span className="w-2.5 h-2.5 rounded-sm bg-[#5EEAD4] shadow-[0_0_6px_#5EEAD4]" />
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
              botState === 'speaking'
                ? 'bg-teal-300 animate-ping'
                : botState === 'listening'
                ? 'bg-cyan-400 animate-pulse'
                : botState === 'thinking'
                ? 'bg-amber-400 animate-spin'
                : 'bg-emerald-400'
            }`}
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-extrabold text-base tracking-wider text-white">
              VECTOR
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 uppercase tracking-widest hidden sm:inline">
              Live Companion
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden xs:block">
            Warm, energetic, curious friend
          </p>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => onViewChange('voice')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            currentView === 'voice'
              ? 'bg-[#5EEAD4] text-slate-950 font-bold shadow-[0_0_12px_rgba(94,234,212,0.35)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Voice</span>
        </button>

        <button
          onClick={() => onViewChange('chat')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            currentView === 'chat'
              ? 'bg-[#5EEAD4] text-slate-950 font-bold shadow-[0_0_12px_rgba(94,234,212,0.35)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat</span>
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5">
        {/* Audio auto-speak toggle */}
        <button
          onClick={voiceSettings.autoSpeak ? onStopAudio : onToggleAutoSpeak}
          title={voiceSettings.autoSpeak ? 'Voice speech enabled' : 'Voice muted'}
          className={`p-2 rounded-xl transition ${
            isAudioPlaying
              ? 'text-teal-300 bg-teal-500/20 border border-teal-500/40 animate-pulse'
              : voiceSettings.autoSpeak
              ? 'text-teal-400 hover:text-teal-300 bg-slate-900 border border-slate-800'
              : 'text-slate-500 bg-slate-900/50 hover:text-slate-400 border border-slate-800/60'
          }`}
        >
          {voiceSettings.autoSpeak ? (
            <Volume2 className="w-4 h-4 text-teal-400" />
          ) : (
            <VolumeX className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {/* Clear chat */}
        <button
          onClick={onClearChat}
          title="Start fresh conversation"
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-teal-300 border border-slate-800 transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          title="Vector & Voice settings"
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-teal-300 border border-slate-800 transition"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
