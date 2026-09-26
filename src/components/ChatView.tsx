import React, { useState, useRef, useEffect } from 'react';
import { Message, BotState, VibeType, VoiceSettings } from '../types';
import { VectorEyes } from './VectorEyes';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Sparkles,
  Flame,
  Heart,
  Smile,
  Compass,
  Coffee,
} from 'lucide-react';

interface ChatViewProps {
  messages: Message[];
  botState: BotState;
  currentVibe: VibeType;
  isMicActive: boolean;
  isAudioPlaying: boolean;
  playingMessageId: string | null;
  voiceSettings: VoiceSettings;
  onSendMessage: (text: string) => void;
  onToggleMic: () => void;
  onPlayMessageAudio: (message: Message) => void;
  onStopAudio: () => void;
  onClearChat: () => void;
  onSwitchToVoice: () => void;
}

const CHAT_STARTERS = [
  'What are you thinking about right now?',
  'Give me your honest thoughts on pineapple on pizza.',
  'I need some hype for today!',
  'Tell me a random weird fact that makes you laugh.',
  'What do you do when you are bored?',
];

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  botState,
  currentVibe,
  isMicActive,
  isAudioPlaying,
  playingMessageId,
  voiceSettings,
  onSendMessage,
  onToggleMic,
  onPlayMessageAudio,
  onStopAudio,
  onClearChat,
  onSwitchToVoice,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, botState]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || botState === 'thinking') return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderVibeBadge = (vibe?: VibeType) => {
    if (!vibe) return null;
    switch (vibe) {
      case 'hyped':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
            <Flame className="w-2.5 h-2.5 text-amber-400" /> Hyped
          </span>
        );
      case 'curious':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/30">
            <Compass className="w-2.5 h-2.5 text-teal-400" /> Curious
          </span>
        );
      case 'playful':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-pink-300 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/30">
            <Smile className="w-2.5 h-2.5 text-pink-400" /> Playful
          </span>
        );
      case 'supportive':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30">
            <Heart className="w-2.5 h-2.5 text-rose-400" /> Supportive
          </span>
        );
      case 'chill':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/30">
            <Coffee className="w-2.5 h-2.5 text-teal-400" /> Chill
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full h-full relative z-10 min-h-0">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <VectorEyes state={botState} vibe={currentVibe} size="md" />
            <div className="max-w-md">
              <h3 className="font-heading font-bold text-xl text-slate-100 mb-1">
                Hey there! I'm Vector ✨
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                I'm your lively conversational friend. Ask me anything, tell me about your day, or spark a fun debate. No stiff robot talk here!
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {CHAT_STARTERS.slice(0, 3).map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(prompt)}
                    className="text-xs px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-teal-500/40 transition text-left"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isUser = message.role === 'user';
            const isPlayingThis = playingMessageId === message.id && isAudioPlaying;

            return (
              <div
                key={message.id}
                className={`flex gap-3 items-start ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 mt-1 shadow-md border border-teal-500/40 flex items-center justify-center gap-1 bg-slate-900">
                    <span className="w-2 h-2 rounded-sm bg-[#5EEAD4] shadow-[0_0_5px_#5EEAD4]" />
                    <span className="w-2 h-2 rounded-sm bg-[#5EEAD4] shadow-[0_0_5px_#5EEAD4]" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 transition-all duration-200 shadow-md ${
                    isUser
                      ? 'bg-slate-800 text-slate-100 border border-teal-500/30 rounded-tr-none'
                      : 'glass-panel text-slate-100 rounded-tl-none border border-slate-800/80'
                  }`}
                >
                  {/* Top meta for bot message */}
                  {!isUser && (
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold text-xs text-teal-300 tracking-wide">
                          VECTOR
                        </span>
                        {renderVibeBadge(message.vibe)}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            isPlayingThis ? onStopAudio() : onPlayMessageAudio(message)
                          }
                          className={`p-1 rounded-md transition ${
                            isPlayingThis
                              ? 'text-teal-300 bg-teal-500/20 animate-pulse'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                          }`}
                          title={isPlayingThis ? 'Stop speaking' : 'Listen with voice'}
                        >
                          {isPlayingThis ? (
                            <VolumeX className="w-3.5 h-3.5 text-teal-400" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleCopy(message.id, message.content)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition"
                          title="Copy text"
                        >
                          {copiedId === message.id ? (
                            <Check className="w-3.5 h-3.5 text-teal-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Message body */}
                  <div className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans">
                    {message.content}
                    {message.isStreaming && (
                      <span className="inline-block w-2 h-4 ml-1 bg-teal-400 animate-pulse align-middle" />
                    )}
                  </div>

                  {/* Timestamp */}
                  <div
                    className={`mt-1.5 text-[10px] ${
                      isUser ? 'text-slate-400 text-right' : 'text-slate-500 text-left'
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                {isUser && (
                  <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 mt-1">
                    {voiceSettings.userName ? voiceSettings.userName.charAt(0).toUpperCase() : 'YOU'}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Thinking Indicator */}
        {botState === 'thinking' && (
          <div className="flex gap-3 items-start justify-start">
            <div className="w-9 h-9 rounded-xl shrink-0 mt-1 flex items-center justify-center gap-1 bg-slate-900 border border-teal-500/40 animate-pulse shadow-md">
              <span className="w-2 h-2 rounded-sm bg-[#5EEAD4] shadow-[0_0_5px_#5EEAD4]" />
              <span className="w-2 h-2 rounded-sm bg-[#5EEAD4] shadow-[0_0_5px_#5EEAD4]" />
            </div>
            <div className="glass-panel text-slate-300 rounded-2xl rounded-tl-none p-3.5 border border-slate-800 flex items-center gap-2">
              <span className="text-xs font-medium text-teal-300">Vector is thinking</span>
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Reply Spark Chips */}
      {messages.length > 0 && botState !== 'thinking' && (
        <div className="px-4 py-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider shrink-0 font-semibold">
            Sparks:
          </span>
          {CHAT_STARTERS.map((starter, i) => (
            <button
              key={i}
              onClick={() => onSendMessage(starter)}
              className="text-xs px-2.5 py-1 rounded-full bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800 hover:border-teal-500/40 whitespace-nowrap transition"
            >
              {starter}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Input Field */}
      <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-4xl mx-auto">
          {/* Voice Mode switch shortcut */}
          <button
            type="button"
            onClick={onSwitchToVoice}
            className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-400 hover:text-teal-300 border border-slate-800 transition"
            title="Open Live Voice Mode"
          >
            <Sparkles className="w-5 h-5" />
          </button>

          {/* Dictate / Mic button */}
          <button
            type="button"
            onClick={onToggleMic}
            className={`p-3 rounded-xl transition ${
              isMicActive
                ? 'bg-[#5EEAD4] text-slate-950 font-bold shadow-[0_0_12px_rgba(94,234,212,0.5)]'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
            }`}
            title={isMicActive ? 'Stop listening' : 'Dictate with microphone'}
          >
            {isMicActive ? <MicOff className="w-5 h-5 text-slate-950" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text Input */}
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Chat casually with Vector..."
              disabled={botState === 'thinking'}
              className="w-full bg-slate-900/90 border border-slate-800 focus:border-teal-400 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || botState === 'thinking'}
            className="p-3 bg-[#5EEAD4] hover:bg-[#2DD4BF] text-slate-950 font-bold rounded-xl transition shadow-[0_0_12px_rgba(94,234,212,0.3)] disabled:opacity-40 disabled:hover:bg-[#5EEAD4]"
          >
            <Send className="w-5 h-5 text-slate-950" />
          </button>
        </form>
      </div>
    </div>
  );
};
