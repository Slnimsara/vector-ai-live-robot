import React, { useEffect, useState, useRef } from 'react';
import { BotState, VibeType } from '../types';

interface VectorEyesProps {
  state: BotState;
  vibe?: VibeType;
  size?: 'fullscreen' | 'lg' | 'md' | 'sm';
  audioLevel?: number; // 0 to 1 amplitude
  isSurprised?: boolean;
  isCameraActive?: boolean;
  isFocusing?: boolean;
  isNodding?: boolean;
  onClick?: () => void;
  subtext?: string;
}

type GazeDirection = {
  x: number;
  y: number;
  skewX: number;
  skewY: number;
};

// Slower, curious/bored natural idle gaze points
const IDLE_GAZE_POSITIONS: GazeDirection[] = [
  { x: 0, y: 0, skewX: 0, skewY: 0 },         // Center
  { x: 0, y: 0, skewX: 0, skewY: 0 },         // Center hold
  { x: -28, y: 0, skewX: -3, skewY: 0 },      // Left
  { x: 28, y: 0, skewX: 3, skewY: 0 },       // Right
  { x: 0, y: -22, skewX: 0, skewY: -2 },      // Up
  { x: 0, y: 18, skewX: 0, skewY: 2 },       // Down
  { x: -22, y: -16, skewX: -2, skewY: -1 },   // Up-Left
  { x: 22, y: -16, skewX: 2, skewY: -1 },    // Up-Right
  { x: -18, y: 14, skewX: -2, skewY: 1 },     // Down-Left
  { x: 18, y: 14, skewX: 2, skewY: 1 },      // Down-Right
];

// Active scanning gaze points when camera vision is enabled
const VISION_SCANNING_POSITIONS: GazeDirection[] = [
  { x: -32, y: 0, skewX: -4, skewY: 0 },      // Scan far left
  { x: -16, y: -6, skewX: -2, skewY: -1 },    // Scan mid-left
  { x: 0, y: 0, skewX: 0, skewY: 0 },         // Center examine
  { x: 16, y: -6, skewX: 2, skewY: -1 },     // Scan mid-right
  { x: 32, y: 0, skewX: 4, skewY: 0 },       // Scan far right
  { x: 0, y: -18, skewX: 0, skewY: -2 },      // Glance up curious
  { x: -18, y: 10, skewX: -2, skewY: 1 },     // Glance down-left
  { x: 18, y: 10, skewX: 2, skewY: 1 },      // Glance down-right
];

export const VectorEyes: React.FC<VectorEyesProps> = ({
  state,
  size = 'fullscreen',
  audioLevel = 0,
  isSurprised = false,
  isCameraActive = false,
  isFocusing = false,
  isNodding = false,
  onClick,
}) => {
  const [gaze, setGaze] = useState<GazeDirection>({ x: 0, y: 0, skewX: 0, skewY: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [isBoredDroop, setIsBoredDroop] = useState(false);
  const [surprisedAnim, setSurprisedAnim] = useState(false);
  const [nodOffset, setNodOffset] = useState(0);

  const gazeTimerRef = useRef<any>(null);
  const blinkTimerRef = useRef<any>(null);
  const boredTimerRef = useRef<any>(null);

  // Trigger surprised widen animation
  useEffect(() => {
    if (isSurprised) {
      setSurprisedAnim(true);
      const timer = setTimeout(() => setSurprisedAnim(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isSurprised]);

  // End-of-sentence subtle agreement nod (+12px down then spring back up in 220ms)
  useEffect(() => {
    if (isNodding) {
      setNodOffset(14);
      const timer = setTimeout(() => {
        setNodOffset(0);
      }, 220);
      return () => clearTimeout(timer);
    }
  }, [isNodding]);

  // Periodic quick robot blink (every 4-8 seconds)
  useEffect(() => {
    const scheduleNextBlink = () => {
      const delay = 4000 + Math.random() * 4000;
      blinkTimerRef.current = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 120);
      }, delay);
    };

    scheduleNextBlink();

    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, []);

  // Occasional slow "bored" half-blink / downward droop (every 8-12 seconds when idle without vision)
  useEffect(() => {
    if (state !== 'idle' || isCameraActive || isFocusing) {
      setIsBoredDroop(false);
      return;
    }

    const scheduleNextBoredDroop = () => {
      const delay = 8000 + Math.random() * 4000;
      boredTimerRef.current = setTimeout(() => {
        setIsBoredDroop(true);
        setTimeout(() => {
          setIsBoredDroop(false);
          scheduleNextBoredDroop();
        }, 1200);
      }, delay);
    };

    scheduleNextBoredDroop();

    return () => {
      if (boredTimerRef.current) clearTimeout(boredTimerRef.current);
    };
  }, [state, isCameraActive, isFocusing]);

  // Gaze wandering & scanning behavior
  useEffect(() => {
    // 1. When examining / focusing on an object, lock straight ahead with slight forward intent
    if (isFocusing) {
      setGaze({ x: 0, y: 2, skewX: 0, skewY: 0 });
      return;
    }

    // 2. When speaking, look forward attentively with speech
    if (state === 'speaking') {
      setGaze({ x: 0, y: 0, skewX: 0, skewY: 0 });
      return;
    }

    // 3. When listening, look attentively forward with slight forward tilt
    if (state === 'listening') {
      setGaze({ x: 0, y: 2, skewX: 0, skewY: 0 });
      return;
    }

    // 4. When thinking, squint up and to the side thoughtfully
    if (state === 'thinking') {
      setGaze({ x: 24, y: -22, skewX: 3, skewY: -2 });
      return;
    }

    // 5. Vision active: energetically scan around left-right-center (every 1.3 - 2.5 seconds)
    if (isCameraActive) {
      const scheduleVisionScan = () => {
        const delay = 1300 + Math.random() * 1200;
        gazeTimerRef.current = setTimeout(() => {
          const nextIdx = Math.floor(Math.random() * VISION_SCANNING_POSITIONS.length);
          setGaze(VISION_SCANNING_POSITIONS[nextIdx]);
          scheduleVisionScan();
        }, delay);
      };

      scheduleVisionScan();

      return () => {
        if (gazeTimerRef.current) clearTimeout(gazeTimerRef.current);
      };
    }

    // 6. Default idle: slow natural drift (every 2 - 6 seconds)
    const scheduleIdleGaze = () => {
      const delay = 2200 + Math.random() * 3800;
      gazeTimerRef.current = setTimeout(() => {
        const nextIdx = Math.floor(Math.random() * IDLE_GAZE_POSITIONS.length);
        setGaze(IDLE_GAZE_POSITIONS[nextIdx]);
        scheduleIdleGaze();
      }, delay);
    };

    scheduleIdleGaze();

    return () => {
      if (gazeTimerRef.current) clearTimeout(gazeTimerRef.current);
    };
  }, [state, isCameraActive, isFocusing]);

  const isSpeaking = state === 'speaking';
  const isListening = state === 'listening';
  const isThinking = state === 'thinking';

  // Compute responsive transforms & scales based on state, audio amplitude, and emotions
  let scaleX = 1;
  let scaleY = 1;
  let glowIntensity = 1;
  let extraTranslateY = nodOffset;

  if (isBlinking) {
    scaleY = 0.05;
  } else if (surprisedAnim) {
    // Wide surprised reaction
    scaleX = 1.22;
    scaleY = 1.25;
    glowIntensity = 1.4;
  } else if (isFocusing) {
    // Close examination: eyes narrow slightly, tighten, lean forward
    scaleX = 1.08;
    scaleY = 0.82;
    glowIntensity = 1.25;
    extraTranslateY += 4;
  } else if (isBoredDroop) {
    // Lazy bored half-blink / droop
    scaleY = 0.65;
    scaleX = 1.02;
    extraTranslateY += 6;
    glowIntensity = 0.85;
  } else if (isSpeaking) {
    // Rhythmic squish and stretch synced with voice amplitude
    const amp = Math.min(1, audioLevel * 1.5);
    scaleY = 0.92 + amp * 0.32;
    scaleX = 1.04 - amp * 0.16;
    glowIntensity = 1.1 + amp * 0.6;
  } else if (isListening) {
    // Widen slightly, attentiveness pulse
    const amp = Math.min(1, audioLevel * 2.2);
    scaleX = 1.06 + amp * 0.08;
    scaleY = 1.06 + amp * 0.08;
    glowIntensity = 1.25 + amp * 0.4;
  } else if (isThinking) {
    // Narrow slightly (squinting up-right)
    scaleX = 1.04;
    scaleY = 0.82;
    glowIntensity = 0.9;
  } else if (isCameraActive) {
    // Actively taking things in
    scaleX = 1.04;
    scaleY = 1.04;
    glowIntensity = 1.15;
  }

  // Dimension classes: adjusted 20-25% smaller with more space between them & breathing room
  const isFullscreen = size === 'fullscreen';
  const isLg = size === 'lg';
  const isMd = size === 'md';

  const containerClasses = isFullscreen
    ? 'w-full h-full flex items-center justify-center p-6 sm:p-10'
    : 'flex items-center justify-center';

  // Eye dimensions (20-25% smaller than previous 36-72 range)
  const eyeSizeClasses = isFullscreen
    ? 'w-28 h-28 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 rounded-[28px] sm:rounded-[40px] md:rounded-[46px] lg:rounded-[54px]'
    : isLg
    ? 'w-20 sm:w-26 h-20 sm:h-26 rounded-[20px] sm:rounded-[26px]'
    : isMd
    ? 'w-10 h-10 rounded-lg'
    : 'w-3.5 h-3.5 rounded-sm';

  // Spacing between the two eyes (expanded for more breathing room)
  const gapClasses = isFullscreen
    ? 'gap-9 sm:gap-16 md:gap-20 lg:gap-24'
    : isLg
    ? 'gap-6 sm:gap-8'
    : isMd
    ? 'gap-3'
    : 'gap-1';

  // Dynamic cyan glow box-shadow based on intensity
  const glowSpread = Math.round(24 * glowIntensity);
  const glowBlur = Math.round(65 * glowIntensity);
  const glowOuter = Math.round(110 * glowIntensity);

  // Inward lean when focusing closely on an object
  const leftEyeLeanX = isFocusing ? 4 : 0;
  const rightEyeLeanX = isFocusing ? -4 : 0;

  const leftEyeStyle: React.CSSProperties = {
    backgroundColor: '#5EEAD4',
    boxShadow: `0 0 ${glowSpread}px rgba(94, 234, 212, 0.85), 0 0 ${glowBlur}px rgba(45, 212, 191, 0.5), 0 0 ${glowOuter}px rgba(94, 234, 212, 0.25), inset 0 0 16px rgba(255, 255, 255, 0.35)`,
    transform: `translate(${gaze.x + leftEyeLeanX}px, ${gaze.y + extraTranslateY}px) skew(${gaze.skewX}deg, ${gaze.skewY}deg) scale(${scaleX}, ${scaleY})`,
    transition: isBlinking
      ? 'transform 0.07s ease-in'
      : isNodding
      ? 'transform 0.12s ease-in-out'
      : isBoredDroop
      ? 'transform 0.45s ease-out'
      : isSpeaking
      ? 'transform 0.09s ease-out, box-shadow 0.1s ease-out'
      : isCameraActive
      ? 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease-out'
      : 'transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease-out',
  };

  const rightEyeStyle: React.CSSProperties = {
    backgroundColor: '#5EEAD4',
    boxShadow: `0 0 ${glowSpread}px rgba(94, 234, 212, 0.85), 0 0 ${glowBlur}px rgba(45, 212, 191, 0.5), 0 0 ${glowOuter}px rgba(94, 234, 212, 0.25), inset 0 0 16px rgba(255, 255, 255, 0.35)`,
    transform: `translate(${gaze.x + rightEyeLeanX}px, ${gaze.y + extraTranslateY}px) skew(${gaze.skewX}deg, ${gaze.skewY}deg) scale(${scaleX}, ${scaleY})`,
    transition: isBlinking
      ? 'transform 0.07s ease-in'
      : isNodding
      ? 'transform 0.12s ease-in-out'
      : isBoredDroop
      ? 'transform 0.45s ease-out'
      : isSpeaking
      ? 'transform 0.09s ease-out, box-shadow 0.1s ease-out'
      : isCameraActive
      ? 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease-out'
      : 'transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease-out',
  };

  return (
    <div className={containerClasses}>
      {/* Eyes Pair Container with subtle idle breathing */}
      <div
        onClick={onClick}
        className={`relative flex items-center justify-center select-none ${gapClasses} ${
          state === 'idle' && !isFocusing ? 'animate-cosmic-pulse' : ''
        } ${onClick ? 'cursor-pointer' : ''}`}
      >
        {/* Left Eye */}
        <div
          className={`${eyeSizeClasses} transform-gpu will-change-transform`}
          style={leftEyeStyle}
        />

        {/* Right Eye */}
        <div
          className={`${eyeSizeClasses} transform-gpu will-change-transform`}
          style={rightEyeStyle}
        />
      </div>
    </div>
  );
};
