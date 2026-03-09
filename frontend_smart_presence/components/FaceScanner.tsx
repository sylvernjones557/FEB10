
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  SwitchCamera,
  User,
  Scan,
  ShieldCheck,
  Zap,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { recognition } from '../services/api';
import { haptics } from '../services/haptics';

export interface FaceMatch {
  student_id: string;
  distance: number;
  confidence: number;
  bbox?: number[];
}

interface DetectedFace {
  id: string;
  name: string | null;
  bbox: number[];
  confidence: number;
  avatar?: string;
}

interface FaceScannerProps {
  onDetect: (count: number, matches?: FaceMatch[]) => void;
  isScanning: boolean;
  onBack?: () => void;
  title?: string;
  lastRecognized?: { name: string; avatar: string; time: string } | null;
  recognizedList?: Map<string, { name: string; confidence: number; avatar: string }>;
  onDone?: () => void;
  count?: number;
  total?: number;
  bottomContent?: React.ReactNode;
  studentLookup?: (id: string) => { name: string; avatar: string } | null;
  alreadyRecognizedIds?: Set<string>;
}

const FaceScanner: React.FC<FaceScannerProps> = ({
  onDetect, isScanning, onBack, title = 'Group Attendance',
  lastRecognized, recognizedList, onDone, count, total,
  bottomContent, studentLookup, alreadyRecognizedIds,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>('Initializing System…');
  const scanningRef = useRef(false);
  const busyRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [totalFacesInFrame, setTotalFacesInFrame] = useState(0);

  const computeBoxStyle = useCallback((bbox: number[]) => {
    const video = videoRef.current;
    const [x1n, y1n, x2n, y2n] = bbox;
    if (!video || !video.videoWidth || !video.clientWidth) {
      return { left: `${x1n * 100}%`, top: `${y1n * 100}%`, width: `${(x2n - x1n) * 100}%`, height: `${(y2n - y1n) * 100}%` };
    }
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cw = video.clientWidth;
    const ch = video.clientHeight;
    const scale = Math.max(cw / vw, ch / vh);
    const displayW = vw * scale;
    const displayH = vh * scale;
    const ox = (displayW - cw) / 2;
    const oy = (displayH - ch) / 2;
    const px1 = x1n * displayW - ox;
    const py1 = y1n * displayH - oy;
    const px2 = x2n * displayW - ox;
    const py2 = y2n * displayH - oy;
    return {
      left: `${(px1 / cw) * 100}%`,
      top: `${(py1 / ch) * 100}%`,
      width: `${((px2 - px1) / cw) * 100}%`,
      height: `${((py2 - py1) / ch) * 100}%`,
    };
  }, []);

  const captureFrame = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return resolve(null);
      const sw = video.videoWidth || 640;
      const sh = video.videoHeight || 480;
      const tw = Math.min(sw, 480);
      const th = Math.max(1, Math.round((sh / sw) * tw));
      if (canvas.width !== tw || canvas.height !== th) { canvas.width = tw; canvas.height = th; }
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return resolve(null);
      ctx.drawImage(video, 0, 0, tw, th);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.6);
    });
  }, []);

  const startCamera = useCallback(async (facing: 'user' | 'environment' = facingMode) => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setError(null);
    setStatusText('Waking Camera Logic…');
    try {
      const ms = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
      });
      streamRef.current = ms;
      setStream(ms);
      if (videoRef.current) videoRef.current.srcObject = ms;
      setStatusText('Synchronized');
      haptics.impactLight();
    } catch (err: any) {
      haptics.notificationError();
      if (err.name === 'NotAllowedError') setError('Camera permission denied.');
      else setError('Could not access camera.');
    }
  }, [facingMode]);

  const toggleCamera = useCallback(() => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    startCamera(next);
  }, [facingMode, startCamera]);

  useEffect(() => { startCamera(); return () => { streamRef.current?.getTracks().forEach(t => t.stop()); }; }, []);
  useEffect(() => { scanningRef.current = isScanning; if (!isScanning) { setStatusText('Idle'); setDetectedFaces([]); } }, [isScanning]);

  useEffect(() => {
    if (!isScanning || !stream) return;
    setStatusText('Biometric Pulse…');
    let tid: number | undefined;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      const delay = document.visibilityState === 'visible' ? 1600 : 3000;
      if (!scanningRef.current || busyRef.current || !videoRef.current || videoRef.current.readyState < 2) {
        tid = window.setTimeout(tick, delay);
        return;
      }
      busyRef.current = true;
      try {
        const blob = await captureFrame();
        if (!blob || cancelled) { tid = window.setTimeout(tick, delay); return; }
        const result = await recognition.recognizeFace(blob);
        if (cancelled) return;

        const faces: DetectedFace[] = [];
        if (result.matches && result.matches.length > 0) {
          for (const m of result.matches) {
            const info = studentLookup ? studentLookup(m.student_id) : null;
            faces.push({
              id: m.student_id,
              name: info?.name || m.student_id.substring(0, 8),
              bbox: m.bbox || [0, 0, 0, 0],
              confidence: (1 - m.distance) * 100,
              avatar: info?.avatar,
            });
          }
        }

        if (result.unrecognized) {
          for (let i = 0; i < result.unrecognized.length; i++) {
            faces.push({
              id: `unknown-${i}`,
              name: null,
              bbox: result.unrecognized[i].bbox || [0, 0, 0, 0],
              confidence: 0,
            });
          }
        }

        const totalInFrame = faces.length;
        const matchedCount = result.matches?.length || 0;
        setDetectedFaces(faces);
        setTotalFacesInFrame(totalInFrame);

        if (totalInFrame > 0) {
          setStatusText(
            matchedCount > 0
              ? `${matchedCount} Synchronized`
              : `${totalInFrame} Target${totalInFrame > 1 ? 's' : ''} Identified`
          );
        } else {
          setStatusText('Capturing Geometry…');
        }

        if (result.match && result.matches.length > 0) {
          const newMatches = result.matches.filter((m: any) =>
            !alreadyRecognizedIds || !alreadyRecognizedIds.has(m.student_id)
          );
          if (newMatches.length > 0) {
            haptics.notificationSuccess();
            onDetect(newMatches.length, newMatches.map((m: any) => ({
              student_id: m.student_id,
              distance: m.distance,
              confidence: (1 - m.distance) * 100,
              bbox: m.bbox,
            })));
          } else {
            onDetect(0, []);
          }
        } else {
          onDetect(0, []);
        }
      } catch {
        // StatusText stays until next loop
      } finally {
        busyRef.current = false;
        tid = window.setTimeout(tick, 1600);
      }
    };

    tick();
    return () => { cancelled = true; if (tid) clearTimeout(tid); };
  }, [isScanning, stream, onDetect, studentLookup]);

  const isMirror = facingMode === 'user';

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col overflow-hidden font-main select-none">

      {/* ── Precision Optical Stream ── */}
      <div className="absolute inset-0">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center gap-6 bg-[#020617]">
            <div className="w-24 h-24 bg-rose-500/10 rounded-[2.5rem] flex items-center justify-center text-rose-500 border border-rose-500/20 shadow-2xl animate-pulse">
              <AlertCircle size={44} />
            </div>
            <div>
              <h3 className="text-xl font-display font-black text-rose-500 uppercase tracking-widest">Signal Failure</h3>
              <p className="text-sm font-medium text-slate-400 mt-2 max-w-xs mx-auto">{error}</p>
            </div>
            <button onClick={() => startCamera()} className="flex items-center gap-3 px-10 py-5 bg-white text-black rounded-[2rem] font-display font-black text-xs uppercase tracking-[0.3em] active:scale-95 transition-all shadow-2xl">
              <RefreshCw size={18} /> Restore Link
            </button>
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover transition-opacity duration-1000 ${isMirror ? 'scale-x-[-1]' : ''}`} />
        )}

        {/* V4 Scanner Overlay Gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none"></div>
        <div className="absolute inset-0 school-grid opacity-[0.2] pointer-events-none"></div>
      </div>

      {/* ── HUD Bounding Overlays ── */}
      {!error && detectedFaces.length > 0 && (
        <div className={`absolute inset-0 pointer-events-none z-20 ${isMirror ? 'scale-x-[-1]' : ''}`}>
          {detectedFaces.map((face) => {
            const boxStyle = computeBoxStyle(face.bbox);
            const isRecognized = face.name !== null;
            const isAlreadyCaptured = isRecognized && alreadyRecognizedIds?.has(face.id);

            return (
              <div key={face.id} className="absolute transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" style={boxStyle}>
                {/* Glow & Border */}
                <div className={`absolute -inset-1 rounded-3xl blur-md opacity-50 ${isAlreadyCaptured ? 'bg-emerald-500' : isRecognized ? 'bg-indigo-500/80 animate-pulse' : 'bg-white/40'}`} />
                <div className={`absolute inset-0 rounded-2xl border-2 ${isAlreadyCaptured ? 'border-emerald-400 bg-emerald-400/5' : isRecognized ? 'border-indigo-400 bg-indigo-500/10' : 'border border-dashed border-white/60 bg-white/5'}`} />

                {/* Identity Tag */}
                <div className={`absolute left-1/2 -bottom-12 -translate-x-1/2 transition-all duration-300 ${isMirror ? 'scale-x-[-1]' : ''}`}>
                  <div className={`px-4 py-2 rounded-xl backdrop-blur-xl border border-white/20 shadow-2xl flex items-center gap-2 whitespace-nowrap ${isAlreadyCaptured ? 'bg-emerald-600/90' : isRecognized ? 'bg-indigo-600/90' : 'bg-black/40'}`}>
                    {isAlreadyCaptured ? (
                      <ShieldCheck size={14} className="text-white" />
                    ) : isRecognized ? (
                      <Zap size={14} className="text-indigo-200 animate-pulse" />
                    ) : (
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                    )}
                    <span className="text-[10px] font-display font-black text-white uppercase tracking-widest">
                      {face.name || 'Decrypting…'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── HUD Header ── */}
      <header className="relative z-30 flex items-center justify-between px-6 pt-[max(16px,env(safe-area-inset-top))] pb-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 active:scale-90 transition-all tap-active">
              <ArrowLeft size={24} className="text-white" />
            </button>
          )}
          <div className="flex flex-col">
            <h2 className="text-base font-display font-black text-white uppercase tracking-[0.2em] leading-none mb-1">{title}</h2>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-[9px] font-black text-indigo-400 uppercase tracking-widest">AI Matrix</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isScanning && !error && (
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-[1.2rem] bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-xl">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
              <span className="text-emerald-400 text-[9px] font-black uppercase tracking-[0.3em]">Synched</span>
            </div>
          )}
          {count !== undefined && (
            <div className="px-4 py-1.5 bg-white/10 backdrop-blur-xl border border-white/10 rounded-[1.2rem] font-display font-black text-white text-[14px] tabular-nums">
              {count}<span className="text-white/30 text-[11px] ml-1">/ {total || '--'}</span>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1" />

      {/* ── HUD Dashboard ── */}
      <div className="relative z-30 px-6 pb-[max(20px,env(safe-area-inset-bottom))] space-y-4">

        {/* Real-time Status */}
        <div className="flex justify-center">
          <div className="px-5 py-2.5 glass-card rounded-full border-white/10 flex items-center gap-3 animate-in">
            <Scan size={14} className="text-indigo-400" />
            <p className="text-white text-[10px] font-black uppercase tracking-[0.2em]">{statusText}</p>
          </div>
        </div>

        {/* Live Seed Wall */}
        {recognizedList && recognizedList.size > 0 && (
          <div className="glass-card rounded-[2.5rem] border-white/10 p-4 animate-in">
            <div className="flex items-center justify-between mb-3 px-2">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">Persistent Data Nodes ({recognizedList.size})</span>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
              {Array.from(recognizedList.entries()).map(([id, info]) => (
                <div key={id} className="relative flex-shrink-0 group">
                  <div className="absolute -inset-1 bg-indigo-500 blur-md opacity-0 group-hover:opacity-40 transition-opacity"></div>
                  <img src={info.avatar} className="relative w-12 h-12 rounded-2xl object-cover border border-white/20" alt="" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-lg border-2 border-[#020617] flex items-center justify-center">
                    <CheckCircle2 size={10} className="text-white" strokeWidth={4} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Control Cluster */}
        <div className="flex items-center gap-4">
          <button onClick={toggleCamera} className="w-16 h-16 flex items-center justify-center rounded-[1.8rem] bg-white/10 backdrop-blur-xl border border-white/10 text-white tap-active hover:bg-white/20 transition-all shadow-2xl">
            <SwitchCamera size={26} />
          </button>

          <div className="flex-1">
            {bottomContent}
          </div>

          {onBack && (
            <button onClick={onBack} className="w-16 h-16 flex items-center justify-center rounded-[1.8rem] bg-indigo-600 text-white tap-active hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-600/30">
              <User size={26} />
            </button>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>,
    document.body
  );
};

export default FaceScanner;
