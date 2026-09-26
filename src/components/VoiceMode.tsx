import React, { useState, useEffect, useRef } from 'react';
import { BotState, VibeType, VoiceSettings, LiveSessionStatus } from '../types';
import { VectorEyes } from './VectorEyes';
import { CameraVision } from './CameraVision';
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Camera,
  CameraOff,
  Settings,
  MessageSquare,
  Sparkles,
  Zap,
} from 'lucide-react';

interface VoiceModeProps {
  botState: BotState;
  vibe: VibeType;
  isAudioPlaying: boolean;
  audioLevel: number;
  liveStatus: LiveSessionStatus;
  liveTranscript: string;
  isLiveMuted: boolean;
  isCameraActive: boolean;
  isFocusing?: boolean;
  isNodding?: boolean;
  latestNovaReply: string;
  voiceSettings: VoiceSettings;
  onStartLive: () => void;
  onStopLive: () => void;
  onToggleLiveMute: () => void;
  onToggleCamera: () => void;
  onSendVideoFrame: (base64Jpeg: string) => void;
  onCameraError: (err: string) => void;
  onSendMessage: (text: string) => void;
  onOpenSettings: () => void;
  onSwitchToChat: () => void;
}

export const VoiceMode: React.FC<VoiceModeProps> = ({
  botState,
  vibe,
  isAudioPlaying,
  audioLevel,
  liveStatus,
  liveTranscript,
  isLiveMuted,
  isCameraActive,
  isFocusing = false,
  isNodding = false,
  latestNovaReply,
  voiceSettings,
  onStartLive,
  onStopLive,
  onToggleLiveMute,
  onToggleCamera,
  onSendVideoFrame,
  onCameraError,
  onSendMessage,
  onOpenSettings,
  onSwitchToChat,
}) => {
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isSurprised, setIsSurprised] = useState(false);
  const hideTimeoutRef = useRef<any>(null);

  const isLiveActive =
    liveStatus === 'connected' || liveStatus === 'listening' || liveStatus === 'speaking';
  const isConnecting = liveStatus === 'connecting';

  // Determine current active bot state for eyes
  const eyeState: BotState =
    liveStatus === 'speaking'
      ? 'speaking'
      : liveStatus === 'listening'
      ? 'listening'
      : liveStatus === 'connecting'
      ? 'thinking'
      : botState;

  // Auto-hide floating controls after 3.8s of inactivity
  const resetHideTimer = () => {
    setControlsVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3800);
  };

  useEffect(() => {
    resetHideTimer();
    const handleActivity = () => resetHideTimer();

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('keydown', handleActivity);

    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, []);

  // When camera is toggled on, trigger surprise animation on the eyes
  const handleToggleCam = () => {
    if (!isCameraActive) {
      setIsSurprised(true);
      setTimeout(() => setIsSurprised(false), 900);
    }
    onToggleCamera();
  };

  return (
    <div
      onClick={resetHideTimer}
      className="relative w-full h-full flex flex-col items-center justify-center bg-black overflow-hidden select-none"
    >
      {/* Subtle deep ambient glow behind eyes */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div
          className={`w-[520px] h-[520px] rounded-full blur-[140px] transition-all duration-700 ${
            eyeState === 'speaking'
              ? 'bg-[#5EEAD4]/18 scale-125'
              : eyeState === 'listening'
              ? 'bg-[#5EEAD4]/15 scale-115'
              : isCameraActive
              ? 'bg-[#5EEAD4]/12 scale-110'
              : 'bg-[#5EEAD4]/8 scale-100'
          }`}
        />
      </div>

      {/* TOP FLOATING CONTROLS BAR (Fades out when inactive, reappears on hover/tap) */}
      <div
        className={`fixed top-5 z-40 transition-all duration-300 transform ${
          controlsVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
        onMouseEnter={() => {
          if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
          setControlsVisible(true);
        }}
        onMouseLeave={resetHideTimer}
      >
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-950/80 backdrop-blur-xl border border-teal-500/25 shadow-2xl shadow-teal-500/10">
          {/* Status badge */}
          <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isLiveActive
                  ? 'bg-[#5EEAD4] shadow-[0_0_8px_#5EEAD4] animate-ping'
                  : 'bg-teal-500/40'
              }`}
            />
            <span className="font-heading font-extrabold text-xs tracking-wider text-[#5EEAD4]">
              VECTOR
            </span>
          </div>

          {/* Camera Vision Toggle */}
          <button
            onClick={handleToggleCam}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isCameraActive
                ? 'bg-[#5EEAD4] text-slate-950 border-[#5EEAD4] shadow-[0_0_12px_rgba(94,234,212,0.5)]'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
            }`}
            title={isCameraActive ? 'Turn camera vision off' : 'Enable real-time camera vision'}
          >
            {isCameraActive ? (
              <>
                <Camera className="w-4 h-4 text-slate-950" />
                <span className="hidden sm:inline text-[11px]">Vision ON</span>
              </>
            ) : (
              <>
                <CameraOff className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px]">Vision</span>
              </>
            )}
          </button>

          {/* Microphone Mute Toggle (when call is active) */}
          {isLiveActive && (
            <button
              onClick={onToggleLiveMute}
              className={`p-2 rounded-xl border text-xs font-medium transition ${
                isLiveMuted
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-teal-300 border-slate-800'
              }`}
              title={isLiveMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isLiveMuted ? <MicOff className="w-4 h-4 text-amber-400" /> : <Mic className="w-4 h-4 text-teal-400" />}
            </button>
          )}

          {/* Start / End Live Voice Call */}
          {!isLiveActive ? (
            <button
              onClick={onStartLive}
              disabled={isConnecting}
              className="px-3.5 py-1.5 rounded-xl bg-[#5EEAD4] hover:bg-[#2DD4BF] text-slate-950 text-xs font-bold flex items-center gap-1.5 transition shadow-[0_0_14px_rgba(94,234,212,0.4)] disabled:opacity-50"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>{isConnecting ? 'Connecting...' : 'Talk Live'}</span>
            </button>
          ) : (
            <button
              onClick={onStopLive}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-rose-600/30"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>End Call</span>
            </button>
          )}

          {/* Chat View Shortcut */}
          <button
            onClick={onSwitchToChat}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-teal-300 border border-slate-800 transition"
            title="Open Chat Messages"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Settings Modal */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-teal-300 border border-slate-800 transition"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FULL-SCREEN VECTOR EYES (Dominates the screen with balanced breathing room) */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <VectorEyes
          state={eyeState}
          vibe={vibe}
          size="fullscreen"
          audioLevel={audioLevel}
          isSurprised={isSurprised}
          isCameraActive={isCameraActive}
          isFocusing={isFocusing}
          isNodding={isNodding}
          onClick={isLiveActive ? undefined : onStartLive}
        />
      </div>

      {/* FLOATING SUBTITLE / SPOKEN RESPONSE (Minimal, bottom centered) */}
      <div className="fixed bottom-8 z-30 max-w-xl w-[90%] px-4 pointer-events-none flex flex-col items-center justify-center text-center">
        {(liveTranscript || latestNovaReply) && (
          <div className="px-5 py-2.5 rounded-2xl bg-black/75 backdrop-blur-md border border-teal-500/20 text-slate-100 text-sm sm:text-base font-medium shadow-2xl transition-all animate-fadeIn">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                Vector
              </span>
              {isFocusing && (
                <span className="text-[9px] font-semibold text-teal-300 bg-teal-500/20 px-1.5 py-0.2 rounded-full border border-teal-500/30">
                  Examining
                </span>
              )}
            </div>
            <p className="line-clamp-3">"{liveTranscript || latestNovaReply}"</p>
          </div>
        )}

        {/* Call to action prompt when disconnected */}
        {!isLiveActive && (
          <div
            onClick={onStartLive}
            className="pointer-events-auto cursor-pointer mt-3 px-4 py-1.5 rounded-full bg-slate-950/80 border border-teal-500/30 text-teal-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg hover:border-teal-400 shadow-teal-500/10"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#5EEAD4] animate-pulse" />
            <span>Tap screen or click to start talking with Vector</span>
          </div>
        )}
      </div>

      {/* CAMERA VISION PREVIEW THUMBNAIL */}
      <CameraVision
        isActive={isCameraActive}
        onSendFrame={onSendVideoFrame}
        onError={onCameraError}
        onClose={onToggleCamera}
      />
    </div>
  );
};
