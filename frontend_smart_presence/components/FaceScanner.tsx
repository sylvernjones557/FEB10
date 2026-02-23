
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { recognition } from '../services/api';

export interface FaceMatch {
  student_id: string;
  distance: number;
  confidence: number;
}

interface FaceScannerProps {
  onDetect: (count: number, matches?: FaceMatch[]) => void;
  isScanning: boolean;
}

/** Capture a JPEG blob from the video element */
function captureFrame(video: HTMLVideoElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const srcWidth = video.videoWidth || 640;
    const srcHeight = video.videoHeight || 480;
    const maxWidth = 512;
    const targetWidth = Math.min(srcWidth, maxWidth);
    const targetHeight = Math.max(1, Math.round((srcHeight / srcWidth) * targetWidth));

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return resolve(null);
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.72);
  });
}

const FaceScanner: React.FC<FaceScannerProps> = ({ onDetect, isScanning }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [detections, setDetections] = useState<{ id: string; label: string; conf: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>('Sensor Ready');
  const scanningRef = useRef(false);
  const busyRef = useRef(false);

  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 20, max: 30 },
        },
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please enable it in browser settings.');
      } else {
        setError('Could not access camera. Please check your device.');
      }
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Keep scanning ref in sync
  useEffect(() => {
    scanningRef.current = isScanning;
    if (!isScanning) {
      setDetections([]);
      setStatusText('Sensor Ready');
    }
  }, [isScanning]);

  // Recognition loop — sends frames to backend every ~2.5s
  useEffect(() => {
    if (!isScanning || !stream) return;

    setStatusText('Scan Mode Active');
    let timeoutId: number | undefined;
    let cancelled = false;

    const runTick = async () => {
      if (cancelled) return;

      const isVisible = document.visibilityState === 'visible';
      const nextDelay = isVisible ? 1100 : 1800;

      if (!scanningRef.current || busyRef.current || !videoRef.current || videoRef.current.readyState < 2) {
        timeoutId = window.setTimeout(runTick, nextDelay);
        return;
      }

      busyRef.current = true;
      try {
        const blob = await captureFrame(videoRef.current);
        if (!blob) {
          timeoutId = window.setTimeout(runTick, nextDelay);
          return;
        }

        const result = await recognition.recognizeFace(blob);

        if (!scanningRef.current || cancelled) {
          timeoutId = window.setTimeout(runTick, nextDelay);
          return;
        }

        if (result.match && result.matches.length > 0) {
          const newDetections = result.matches.map((m) => ({
            id: m.student_id,
            label: m.student_id,
            conf: ((1 - m.distance) * 100).toFixed(1),
          }));

          setDetections(newDetections);
          setStatusText(`Recognized ${result.matches.length} member(s)`);

          const faceMatches: FaceMatch[] = result.matches.map((m) => ({
            student_id: m.student_id,
            distance: m.distance,
            confidence: (1 - m.distance) * 100,
          }));
          onDetect(result.matches.length, faceMatches);
        } else {
          setDetections([]);
          setStatusText('Scanning — no match yet');
          onDetect(0, []);
        }
      } catch (err) {
        console.error('Recognition error:', err);
        setStatusText('Scanner active');
      } finally {
        busyRef.current = false;
        timeoutId = window.setTimeout(runTick, nextDelay);
      }
    };

    runTick();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [isScanning, stream, onDetect]);

  return (
    <div className="relative w-full aspect-square md:aspect-video bg-slate-900 rounded-none overflow-hidden group">
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-slate-900">
           <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 border border-rose-500/20">
             <AlertCircle size={32} />
           </div>
           <p className="text-sm font-bold text-slate-300 max-w-xs">{error}</p>
           <button 
             onClick={startCamera}
             className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl tap-active"
           >
             <RefreshCw size={16} /> Retry Camera
           </button>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />
      )}

      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.3)]"></div>

        <div className="absolute top-6 left-6 flex items-center gap-2.5 bg-white/90 nav-blur px-4 py-2 rounded-xl border border-slate-100 shadow-lg">
          <div className={`w-2 h-2 rounded-full ${isScanning && !error ? 'bg-indigo-600 animate-pulse shadow-[0_0_8px_rgba(79,70,229,0.8)]' : 'bg-slate-300'}`}></div>
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-900">
            {statusText}
          </span>
        </div>

        {detections.length > 0 && (
          <div className="absolute top-6 right-6 max-w-[55%] bg-white/90 nav-blur rounded-xl border border-slate-100 shadow-lg p-3 space-y-2">
            {detections.slice(0, 3).map((det) => (
              <div key={`${det.id}-${det.conf}`} className="flex items-center justify-between gap-3">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-900 truncate">{det.label}</span>
                <span className="text-[9px] font-black text-indigo-700">{det.conf}%</span>
              </div>
            ))}
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center opacity-25">
           <div className="w-64 h-64 border border-indigo-600 rounded-full flex items-center justify-center">
              <div className="w-1 h-10 bg-indigo-600 rounded-full absolute top-0"></div>
              <div className="w-1 h-10 bg-indigo-600 rounded-full absolute bottom-0"></div>
              <div className="h-1 w-10 bg-indigo-600 rounded-full absolute left-0"></div>
              <div className="h-1 w-10 bg-indigo-600 rounded-full absolute right-0"></div>
           </div>
        </div>

        {isScanning && !error && (
          <div className="absolute inset-0 overflow-hidden">
             <div className="w-full h-32 bg-gradient-to-b from-transparent via-indigo-600/10 to-transparent absolute top-0 animate-[scan_3s_linear_infinite]" 
                  style={{animation: 'scan-move 3s linear infinite'}}></div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scan-move {
          from { top: -20%; }
          to { top: 120%; }
        }
      `}</style>
    </div>
  );
};

export default FaceScanner;
