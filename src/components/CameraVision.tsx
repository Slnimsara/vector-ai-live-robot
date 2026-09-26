import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, Eye, EyeOff, Maximize2, Minimize2, AlertCircle } from 'lucide-react';

interface CameraVisionProps {
  isActive: boolean;
  onSendFrame: (base64Jpeg: string) => void;
  onError: (errMsg: string) => void;
  onClose: () => void;
}

export const CameraVision: React.FC<CameraVisionProps> = ({
  isActive,
  onSendFrame,
  onError,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<any>(null);

  const [isMinimized, setIsMinimized] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isActive) {
      // Stop webcam if deactivated
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      return;
    }

    let isMounted = true;

    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setHasPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        // Offscreen canvas for JPEG frame captures
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 360;
        canvasRef.current = canvas;
        const ctx = canvas.getContext('2d');

        // Stream 1 frame per second to Gemini Live API
        intervalRef.current = setInterval(() => {
          if (!videoRef.current || !ctx || videoRef.current.readyState < 2) return;

          try {
            ctx.drawImage(videoRef.current, 0, 0, 480, 360);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.55);
            const base64Data = dataUrl.split(',')[1];
            if (base64Data) {
              onSendFrame(base64Data);
            }
          } catch (e) {
            console.warn('Frame capture error:', e);
          }
        }, 1000);
      } catch (err: any) {
        console.warn('Webcam permission error:', err);
        setHasPermission(false);
        onError(
          err.name === 'NotAllowedError'
            ? 'Camera access was blocked. Vector will continue talking with you in voice-only mode!'
            : 'Could not access camera. Vector will continue in voice mode.'
        );
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isActive, onSendFrame, onError]);

  if (!isActive) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 select-none">
      {/* Offscreen canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Floating Preview Card */}
      <div
        className={`glass-panel border border-teal-500/30 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
          isMinimized ? 'w-44 h-12' : 'w-56 sm:w-64 h-44 sm:h-50'
        }`}
      >
        {/* Card Header Bar */}
        <div className="px-3 py-1.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
            <span className="font-semibold text-teal-300 text-[11px] tracking-wide">
              Vector Vision
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded text-slate-400 hover:text-white transition"
              title={isMinimized ? 'Expand preview' : 'Minimize preview'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-rose-400 transition"
              title="Turn camera off"
            >
              <CameraOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Video feed or fallback */}
        {!isMinimized && (
          <div className="relative w-full h-[calc(100%-30px)] bg-black overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover transform -scale-x-100"
            />
            {hasPermission === false && (
              <div className="absolute inset-0 bg-slate-950/90 p-3 flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-6 h-6 text-amber-400 mb-1" />
                <span className="text-[11px] text-slate-300">
                  Camera disabled. Voice mode active!
                </span>
              </div>
            )}
            <div className="absolute bottom-1.5 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] text-teal-300 font-mono">
              Live feed (1 fps)
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
