import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, BotState, VibeType, VoiceSettings, LiveSessionStatus } from './types';
import { Header } from './components/Header';
import { VoiceMode } from './components/VoiceMode';
import { ChatView } from './components/ChatView';
import { SettingsModal } from './components/SettingsModal';
import {
  playPcmAudio,
  speakWithBrowser,
  stopAllSpeech,
  playSoundEffect,
  GeminiLiveClient,
} from './utils/audio';

const DEFAULT_SETTINGS: VoiceSettings = {
  voice: 'Zephyr',
  autoSpeak: true,
  useGeminiTts: true,
  soundEffects: true,
  userName: '',
  speechRate: 1.0,
};

const INITIAL_WELCOME: Message = {
  id: 'welcome-1',
  role: 'model',
  content: "Hey there! I'm Vector ✨ Tap 'Talk Live' or enable camera vision — I'm all ears and eyes!",
  timestamp: Date.now(),
  vibe: 'hyped',
};

// Check if a prompt is asking Vector to examine / look closely at something
function isExaminationPrompt(text: string): boolean {
  return /what(?:'s| is) (?:this|that|in my hand|i(?:'m| am) holding)|what do you see|look at (?:this|that|me)|do you see|tell me what|describe what|can you see|what am i|what color|what brand|who is this|who is that|check this/i.test(
    text
  );
}

export default function App() {
  // Navigation & UI state
  const [currentView, setCurrentView] = useState<'voice' | 'chat'>('voice');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cameraToast, setCameraToast] = useState<string | null>(null);

  // Bot & Chat state
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved =
        localStorage.getItem('vector_chat_history') || localStorage.getItem('nova_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // Fallback
    }
    return [INITIAL_WELCOME];
  });

  const [botState, setBotState] = useState<BotState>('idle');
  const [currentVibe, setCurrentVibe] = useState<VibeType>('hyped');
  const [latestVectorReply, setLatestVectorReply] = useState<string>(INITIAL_WELCOME.content);

  // Audio state
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Live API (gemini-3.8-live) state
  const [liveStatus, setLiveStatus] = useState<LiveSessionStatus>('disconnected');
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [isLiveMuted, setIsLiveMuted] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isFocusing, setIsFocusing] = useState(false);
  const [isNodding, setIsNodding] = useState(false);

  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const lastNodTimeRef = useRef<number>(0);

  // Settings state
  const [settings, setSettings] = useState<VoiceSettings>(() => {
    try {
      const saved =
        localStorage.getItem('vector_voice_settings') ||
        localStorage.getItem('nova_voice_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      // Fallback
    }
    return DEFAULT_SETTINGS;
  });

  // Save chat to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('vector_chat_history', JSON.stringify(messages));
    } catch (e) {
      // Ignore
    }
  }, [messages]);

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('vector_voice_settings', JSON.stringify(settings));
    } catch (e) {
      // Ignore
    }
  }, [settings]);

  // Cleanup Live Client on unmount
  useEffect(() => {
    return () => {
      if (liveClientRef.current) {
        liveClientRef.current.stop();
      }
    };
  }, []);

  // Trigger agreement nod animation with throttle to keep it subtle
  const triggerAgreementNod = useCallback(() => {
    const now = Date.now();
    if (now - lastNodTimeRef.current < 3200) return;
    lastNodTimeRef.current = now;
    setIsNodding(true);
    setTimeout(() => {
      setIsNodding(false);
    }, 240);
  }, []);

  // Stop audio helper
  const handleStopAudio = useCallback(() => {
    stopAllSpeech();
    setIsAudioPlaying(false);
    setPlayingMessageId(null);
    setAudioLevel(0);
    setIsFocusing(false);
    setBotState((prev) => (prev === 'speaking' ? 'idle' : prev));
  }, []);

  // Start Gemini Live API (gemini-3.8-live) Call
  const handleStartLive = useCallback(async () => {
    handleStopAudio();
    if (settings.soundEffects) playSoundEffect('mic-on');

    if (!liveClientRef.current) {
      liveClientRef.current = new GeminiLiveClient({
        onStatusChange: (status) => {
          setLiveStatus(status);
          if (status === 'speaking') {
            setIsAudioPlaying(true);
            setBotState('speaking');
          } else if (status === 'listening') {
            setIsAudioPlaying(false);
            setAudioLevel(0);
            setIsFocusing(false); // release focus when Vector finishes describing
            triggerAgreementNod(); // friendly nod agreement as it concludes speaking
            setBotState('listening');
          } else if (status === 'disconnected') {
            setIsAudioPlaying(false);
            setAudioLevel(0);
            setIsFocusing(false);
            setBotState('idle');
          }
        },
        onTranscript: (text, isModel) => {
          if (isModel) {
            setLiveTranscript((prev) => prev + text);
            setLatestVectorReply((prev) => prev + text);

            // Trigger agreement nod on complete sentence boundary (. ! ?)
            if (
              /[.!?]\s*$/.test(text) ||
              text.includes('. ') ||
              text.includes('! ') ||
              text.includes('? ')
            ) {
              triggerAgreementNod();
            }
          }
        },
        onInterrupted: () => {
          setIsAudioPlaying(false);
          setAudioLevel(0);
          setIsFocusing(false);
          setBotState('listening');
        },
        onError: (err) => {
          console.warn('Live API error:', err);
        },
        onAudioLevel: (level) => {
          setAudioLevel(level);
        },
      });
    }

    setLiveTranscript('');
    await liveClientRef.current.start(settings.voice, settings.userName);
  }, [handleStopAudio, settings.soundEffects, settings.voice, settings.userName, triggerAgreementNod]);

  // Stop Gemini Live API Call
  const handleStopLive = useCallback(() => {
    if (settings.soundEffects) playSoundEffect('mic-off');
    if (liveClientRef.current) {
      liveClientRef.current.stop();
      liveClientRef.current = null;
    }
    setLiveStatus('disconnected');
    setIsAudioPlaying(false);
    setAudioLevel(0);
    setIsFocusing(false);
    setBotState('idle');
  }, [settings.soundEffects]);

  // Toggle Live Microphone Mute
  const handleToggleLiveMute = useCallback(() => {
    if (!liveClientRef.current) return;
    const newMuted = !isLiveMuted;
    setIsLiveMuted(newMuted);
    liveClientRef.current.setMuted(newMuted);
    if (settings.soundEffects) playSoundEffect(newMuted ? 'mic-off' : 'mic-on');
  }, [isLiveMuted, settings.soundEffects]);

  // Toggle Camera Vision
  const handleToggleCamera = useCallback(() => {
    const nextState = !isCameraActive;
    setIsCameraActive(nextState);

    // If starting camera but not yet in live call, automatically connect live call
    if (nextState && liveStatus === 'disconnected') {
      handleStartLive();
    }
  }, [isCameraActive, liveStatus, handleStartLive]);

  // Send Video Frame to Gemini Live API
  const handleSendVideoFrame = useCallback((base64Jpeg: string) => {
    if (liveClientRef.current) {
      liveClientRef.current.sendVideoFrame(base64Jpeg);
    }
  }, []);

  // Handle Camera Permission / Device Error
  const handleCameraError = useCallback((errMsg: string) => {
    setIsCameraActive(false);
    setCameraToast(errMsg);
    setTimeout(() => setCameraToast(null), 5000);
  }, []);

  // Text-to-Speech function for Vector's reply (used in chat mode)
  const speakReply = useCallback(
    async (text: string, messageId?: string) => {
      handleStopAudio();
      setIsAudioPlaying(true);
      if (messageId) setPlayingMessageId(messageId);
      setBotState('speaking');

      let playedViaPcm = false;

      // Try Gemini TTS first if enabled
      if (settings.useGeminiTts) {
        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text,
              voice: settings.voice,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.audio) {
              playedViaPcm = true;
              await playPcmAudio(data.audio, data.sampleRate || 24000, () => {
                setIsAudioPlaying(false);
                setPlayingMessageId(null);
                triggerAgreementNod();
                setIsFocusing(false);
                setBotState('idle');
              });
              return;
            }
          }
        } catch (e) {
          console.warn('Gemini TTS error, falling back to browser speech:', e);
        }
      }

      // Fallback to browser SpeechSynthesis
      if (!playedViaPcm) {
        speakWithBrowser(text, settings.speechRate, () => {
          setIsAudioPlaying(false);
          setPlayingMessageId(null);
          triggerAgreementNod();
          setIsFocusing(false);
          setBotState('idle');
        });
      }
    },
    [handleStopAudio, settings.useGeminiTts, settings.voice, settings.speechRate, triggerAgreementNod]
  );

  // Send message to Vector
  const handleSendMessage = useCallback(
    async (userText: string) => {
      if (!userText.trim()) return;

      const examining = isExaminationPrompt(userText) || isCameraActive;
      if (examining) {
        setIsFocusing(true);
      }

      // If Live session is active, route through Live API
      if (
        liveClientRef.current &&
        (liveStatus === 'connected' || liveStatus === 'listening' || liveStatus === 'speaking')
      ) {
        setLiveTranscript('');
        liveClientRef.current.sendText(userText.trim());
        return;
      }

      handleStopAudio();

      if (settings.soundEffects) {
        playSoundEffect('send');
      }

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userText.trim(),
        timestamp: Date.now(),
      };

      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setBotState('thinking');

      try {
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            userName: settings.userName,
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error('Chat API failed');
        }

        const botMsgId = `bot-${Date.now()}`;
        const initialBotMsg: Message = {
          id: botMsgId,
          role: 'model',
          content: '',
          timestamp: Date.now(),
          vibe: 'chill',
          isStreaming: true,
        };

        setMessages((prev) => [...prev, initialBotMsg]);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = '';
        let finalVibe: VibeType = 'chill';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6));
                if (event.type === 'chunk' && event.text) {
                  accumulatedText += event.text;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === botMsgId ? { ...m, content: accumulatedText } : m
                    )
                  );
                } else if (event.type === 'done') {
                  finalVibe = event.vibe || 'chill';
                  if (event.fullText) accumulatedText = event.fullText;
                }
              } catch (e) {
                // Ignore chunk parse error
              }
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId
              ? { ...m, content: accumulatedText, vibe: finalVibe, isStreaming: false }
              : m
          )
        );

        setCurrentVibe(finalVibe);
        setLatestVectorReply(accumulatedText);
        setBotState('idle');

        if (settings.soundEffects) {
          playSoundEffect('receive');
        }

        // Auto speak Vector's reply if enabled
        if (settings.autoSpeak && accumulatedText) {
          speakReply(accumulatedText, botMsgId);
        } else {
          setIsFocusing(false);
          triggerAgreementNod();
        }
      } catch (err: any) {
        console.error('Failed to get Vector reply:', err);
        setBotState('idle');
        setIsFocusing(false);

        const errorMsg: Message = {
          id: `bot-err-${Date.now()}`,
          role: 'model',
          content: "Wait, my connection sputtered for a sec! Could you say that again?",
          timestamp: Date.now(),
          vibe: 'chill',
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    },
    [
      handleStopAudio,
      isCameraActive,
      liveStatus,
      settings.soundEffects,
      settings.userName,
      settings.autoSpeak,
      messages,
      speakReply,
      triggerAgreementNod,
    ]
  );

  // Clear chat
  const handleClearChat = useCallback(() => {
    handleStopAudio();
    if (liveClientRef.current) {
      handleStopLive();
    }
    const newWelcome: Message = {
      ...INITIAL_WELCOME,
      id: `welcome-${Date.now()}`,
      timestamp: Date.now(),
    };
    setMessages([newWelcome]);
    setLatestVectorReply(newWelcome.content);
    setLiveTranscript('');
    setCurrentVibe('hyped');
    setBotState('idle');
    setIsFocusing(false);
  }, [handleStopAudio, handleStopLive]);

  // Play audio for specific message in ChatView
  const handlePlayMessageAudio = useCallback(
    (message: Message) => {
      speakReply(message.content, message.id);
    },
    [speakReply]
  );

  // Test voice in settings
  const handleTestVoice = useCallback(() => {
    speakReply(
      `Hey! This is Vector using the ${settings.voice} voice. How do I sound?`,
      'test-voice'
    );
  }, [speakReply, settings.voice]);

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-slate-100 overflow-hidden font-sans relative">
      {/* Toast Notification for Camera Permission / Friendly Alerts */}
      {cameraToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-teal-500/40 text-teal-200 text-xs font-medium shadow-2xl backdrop-blur-md animate-fadeIn flex items-center gap-2">
          <span>{cameraToast}</span>
          <button
            onClick={() => setCameraToast(null)}
            className="text-slate-400 hover:text-white font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* When in Chat View, render Top Navigation Header */}
      {currentView === 'chat' && (
        <Header
          currentView={currentView}
          botState={botState}
          vibe={currentVibe}
          voiceSettings={settings}
          isAudioPlaying={isAudioPlaying}
          onViewChange={setCurrentView}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onClearChat={handleClearChat}
          onToggleAutoSpeak={() =>
            setSettings((prev) => ({ ...prev, autoSpeak: !prev.autoSpeak }))
          }
          onStopAudio={handleStopAudio}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 relative z-10 overflow-hidden bg-black">
        {currentView === 'voice' ? (
          <VoiceMode
            botState={botState}
            vibe={currentVibe}
            isAudioPlaying={isAudioPlaying}
            audioLevel={audioLevel}
            liveStatus={liveStatus}
            liveTranscript={liveTranscript}
            isLiveMuted={isLiveMuted}
            isCameraActive={isCameraActive}
            isFocusing={isFocusing}
            isNodding={isNodding}
            latestNovaReply={latestVectorReply}
            voiceSettings={settings}
            onStartLive={handleStartLive}
            onStopLive={handleStopLive}
            onToggleLiveMute={handleToggleLiveMute}
            onToggleCamera={handleToggleCamera}
            onSendVideoFrame={handleSendVideoFrame}
            onCameraError={handleCameraError}
            onSendMessage={handleSendMessage}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onSwitchToChat={() => setCurrentView('chat')}
          />
        ) : (
          <ChatView
            messages={messages}
            botState={botState}
            currentVibe={currentVibe}
            isMicActive={liveStatus === 'listening'}
            isAudioPlaying={isAudioPlaying}
            playingMessageId={playingMessageId}
            voiceSettings={settings}
            onSendMessage={handleSendMessage}
            onToggleMic={liveStatus === 'disconnected' ? handleStartLive : handleStopLive}
            onPlayMessageAudio={handlePlayMessageAudio}
            onStopAudio={handleStopAudio}
            onClearChat={handleClearChat}
            onSwitchToVoice={() => setCurrentView('voice')}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateSettings={(newSettings) =>
          setSettings((prev) => ({ ...prev, ...newSettings }))
        }
        onTestVoice={handleTestVoice}
      />
    </div>
  );
}
