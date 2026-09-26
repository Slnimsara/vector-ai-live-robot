import React from 'react';
import { VoiceSettings, VoiceName } from '../types';
import { X, Volume2, User, Sparkles, Sliders, Bell } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  settings: VoiceSettings;
  onClose: () => void;
  onUpdateSettings: (newSettings: Partial<VoiceSettings>) => void;
  onTestVoice: () => void;
}

const VOICES: { name: VoiceName; gender: string; description: string }[] = [
  { name: 'Zephyr', gender: 'Neutral', description: 'Friendly, upbeat, and bright' },
  { name: 'Puck', gender: 'Male', description: 'Energetic, witty, and playful banter' },
  { name: 'Kore', gender: 'Female', description: 'Warm, expressive, and natural friend' },
  { name: 'Fenrir', gender: 'Male', description: 'Deep, relaxed, and chill vibe' },
  { name: 'Charon', gender: 'Neutral', description: 'Thoughtful, calm, and grounded' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onUpdateSettings,
  onTestVoice,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-teal-400" />
            <h2 className="font-heading font-bold text-lg text-white">
              Vector Companion Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content scroll area */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* User Name Personalization */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              <User className="w-3.5 h-3.5 text-teal-400" />
              Your Name or Nickname
            </label>
            <input
              type="text"
              value={settings.userName}
              onChange={(e) => onUpdateSettings({ userName: e.target.value })}
              placeholder="e.g. Alex, Sam, Jamie"
              className="w-full bg-slate-950 border border-slate-800 focus:border-teal-400 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Vector will address you by name naturally like a close buddy.
            </p>
          </div>

          {/* Voice Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Volume2 className="w-3.5 h-3.5 text-teal-400" />
                Vector's Voice
              </label>
              <button
                type="button"
                onClick={onTestVoice}
                className="text-xs text-teal-400 hover:text-teal-300 font-semibold"
              >
                Test Voice 🔊
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {VOICES.map((v) => (
                <button
                  key={v.name}
                  onClick={() => onUpdateSettings({ voice: v.name })}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    settings.voice === v.name
                      ? 'bg-teal-500/15 border-teal-500/60 text-white shadow-md shadow-teal-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-heading font-bold text-sm text-teal-300">{v.name}</span>
                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {v.gender}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                    {v.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Voice Auto-Speak Toggle */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-slate-200 block">
                  Auto-Read Responses
                </span>
                <span className="text-xs text-slate-500">
                  Vector speaks answers out loud automatically
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoSpeak}
                onChange={(e) => onUpdateSettings({ autoSpeak: e.target.checked })}
                className="w-5 h-5 rounded accent-teal-400 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-slate-200 block">
                  Gemini High-Fidelity Voice
                </span>
                <span className="text-xs text-slate-500">
                  Use gemini-3.8-flash-lite-tts for ultra-natural speech
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.useGeminiTts}
                onChange={(e) => onUpdateSettings({ useGeminiTts: e.target.checked })}
                className="w-5 h-5 rounded accent-teal-400 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-teal-400" />
                <div>
                  <span className="text-sm font-medium text-slate-200 block">
                    UI Sound Effects
                  </span>
                  <span className="text-xs text-slate-500">
                    Play gentle harmonic chimes on interaction
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.soundEffects}
                onChange={(e) => onUpdateSettings({ soundEffects: e.target.checked })}
                className="w-5 h-5 rounded accent-teal-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Persona Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span className="font-heading font-bold text-xs uppercase tracking-wider text-teal-300">
                Vector's Persona
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Warm, energetic, and endlessly curious. Chats in short, punchy 1-4 sentence turns like a close friend texting in real time, with humor, casual phrasing, and genuine back-and-forth flow.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#5EEAD4] hover:bg-[#2DD4BF] text-slate-950 font-bold text-sm transition shadow-[0_0_12px_rgba(94,234,212,0.3)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
