
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, RefreshCw, ArrowLeft, CheckCircle2, ChevronRight, SwitchCamera, User, Scan } from 'lucide-react';
import { recognition } from '../services/api';

export interface FaceMatch {
  student_id: string;
  distance: number;
  confidence: number;
  bbox?: number[]; // [x1, y1, x2, y2] normalized 0-1
}

/** A detected face box to render over the video feed */
interface DetectedFace {
  id: string;
  name: string | null;   // null = unrecognized
  bbox: number[];         // [x1, y1, x2, y2] normalized 0-1
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
  /** Lookup function: given a student_id, return name + avatar. Provided by parent. */
  studentLookup?: (id: string) => { name: string; avatar: string } | null;
  /** Set of student IDs already recognized — skip sending them again */
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
  const [statusText, setStatusText] = useState<string>('Initializing…');
  const scanningRef = useRef(false);
  const busyRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Detected faces for bounding box overlay
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [totalFacesInFrame, setTotalFacesInFrame] = useState(0);

  /** Map normalized bbox coords → CSS percentages, accounting for object-cover crop */
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
    // object-cover: scale to fill, then center-crop
    const scale = Math.max(cw / vw, ch / vh);
    const displayW = vw * scale;
    const displayH = vh * scale;
    const ox = (displayW - cw) / 2; // pixels cropped on each side
    const oy = (displayH - ch) / 2;
    // Convert normalized bbox to display pixels, subtract crop offset, then to %
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
      const tw = Math.min(sw, 640);
      const th = Math.max(1, Math.round((sh / sw) * tw));
      if (canvas.width !== tw || canvas.height !== th) { canvas.width = tw; canvas.height = th; }
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return resolve(null);
      ctx.drawImage(video, 0, 0, tw, th);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.72);
    });
  }, []);

  const startCamera = useCallback(async (facing: 'user' | 'environment' = facingMode) => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setError(null);
    setStatusText('Starting camera…');
    try {
      const ms = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
      });
      streamRef.current = ms;
      setStream(ms);
      if (videoRef.current) videoRef.current.srcObject = ms;
      setStatusText('Ready');
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') setError('Camera permission denied. Enable it in browser settings.');
      else setError('Could not access camera. Check your device.');
    }
  }, [facingMode]);

  const toggleCamera = useCallback(() => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    startCamera(next);
  }, [facingMode, startCamera]);

  useEffect(() => { startCamera(); return () => { streamRef.current?.getTracks().forEach(t => t.stop()); }; }, []);
  useEffect(() => { scanningRef.current = isScanning; if (!isScanning) { setStatusText('Paused'); setDetectedFaces([]); } }, [isScanning]);

  // Recognition loop — sends frame, gets back bboxes + matches
  useEffect(() => {
    if (!isScanning || !stream) return;
    setStatusText('Scanning…');
    let tid: number | undefined;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      const delay = document.visibilityState === 'visible' ? 1100 : 2000;
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

        // Recognized faces
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

        // Unrecognized faces
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
              ? `${matchedCount} recognized${totalInFrame > matchedCount ? ` · ${totalInFrame - matchedCount} scanning` : ''}`
              : `${totalInFrame} face${totalInFrame > 1 ? 's' : ''} detected`
          );
        } else {
          setStatusText('Looking for faces…');
        }

        // Forward NEW matches to parent (skip already-recognized students)
        if (result.match && result.matches.length > 0) {
          const newMatches = result.matches.filter((m: any) => 
            !alreadyRecognizedIds || !alreadyRecognizedIds.has(m.student_id)
          );
          if (newMatches.length > 0) {
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
        setStatusText('Scanning…');
        setDetectedFaces([]);
      } finally {
        busyRef.current = false;
        tid = window.setTimeout(tick, 1100);
      }
    };

    tick();
    return () => { cancelled = true; if (tid) clearTimeout(tid); };
  }, [isScanning, stream, onDetect, studentLookup]);

  const isMirror = facingMode === 'user';

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col overflow-hidden font-['Inter',sans-serif]">

      {/* ── Full-screen camera feed ── */}
      <div className="absolute inset-0">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center gap-5 bg-black">
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-400 border border-rose-500/20">
              <AlertCircle size={36} />
            </div>
            <p className="text-sm font-semibold text-white/70 max-w-xs">{error}</p>
            <button onClick={() => startCamera()} className="flex items-center gap-2 px-7 py-3.5 bg-white text-black rounded-full font-bold text-[13px] active:scale-95 transition-transform">
              <RefreshCw size={16} /> Retry
            </button>
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted
            className={`w-full h-full object-cover ${isMirror ? 'scale-x-[-1]' : ''}`}
          />
        )}
      </div>

      {/* ── Bounding box overlay ── */}
      {!error && detectedFaces.length > 0 && (
        <div className={`absolute inset-0 pointer-events-none z-20 ${isMirror ? 'scale-x-[-1]' : ''}`}>
          {detectedFaces.map((face) => {
            const boxStyle = computeBoxStyle(face.bbox);
            const isRecognized = face.name !== null;
            const isAlreadyCaptured = isRecognized && alreadyRecognizedIds?.has(face.id);

            return (
              <div key={face.id} className="absolute transition-all duration-500 ease-out"
                style={boxStyle}
              >
                {/* Glow effect behind box */}
                <div className={`absolute -inset-1 rounded-2xl blur-md opacity-40 ${
                  isAlreadyCaptured
                    ? 'bg-emerald-400'
                    : isRecognized
                      ? 'bg-blue-500 animate-pulse'
                      : 'bg-amber-400/50'
                }`} />

                {/* Main bounding box */}
                <div className={`absolute inset-0 rounded-xl ${
                  isAlreadyCaptured
                    ? 'border-2 border-emerald-400 bg-emerald-400/5'
                    : isRecognized
                      ? 'border-2 border-blue-400 bg-blue-400/5'
                      : 'border border-dashed border-amber-400/70 bg-amber-400/5'
                }`} />

                {/* Animated corner brackets */}
                {(isRecognized || isAlreadyCaptured) && (
                  <>
                    {/* Top-left */}
                    <div className={`absolute -top-[1px] -left-[1px] w-5 h-5 ${isAlreadyCaptured ? 'border-emerald-300' : 'border-blue-300'}`}>
                      <div className={`absolute top-0 left-0 w-full h-[3px] rounded-full ${isAlreadyCaptured ? 'bg-emerald-300' : 'bg-blue-300'}`} />
                      <div className={`absolute top-0 left-0 w-[3px] h-full rounded-full ${isAlreadyCaptured ? 'bg-emerald-300' : 'bg-blue-300'}`} />
                    </div>
                    {/* Top-right */}
                    <div className={`absolute -top-[1px] -right-[1px] w-5 h-5`}>
                      <div className={`absolute top-0 right-0 w-full h-[3px] rounded-full ${isAlreadyCaptured ? 'bg-emerald-300' : 'bg-blue-300'}`} />
                      <div className={`absolute top-0 right-0 w-[3px] h-full rounded-full ${isAlreadyCaptured ? 'bg-emerald-300' : 'bg-blue-300'}`} />
                    </div>
                    {/* Bottom-left */}
                    <div className={`absolute -bottom-[1px] -left-[1px] w-5 h-5`}>
                      <div className={`absolute bottom-0 left-0 w-full h-[3px] rounded-full ${isAlreadyCaptured ? 'bg-emerald-300' : 'bg-blue-300'}`} />
                      <div className={`absolute bottom-0 left-0 w-[3px] h-full rounded-full ${isAlreadyCaptured ? 'bg-emerald-300' : 'bg-blue-300'}`} />
                    </div>
                    {/* Bottom-right */}
                    <div className={`absolute -bottom-[1px] -right-[1px] w-5 h-5`}>
                      <div className={`absolute bottom-0 right-0 w-full h-[3px] rounded-full ${isAlreadyCaptured ? 'bg-emerald-300' : 'bg-blue-300'}`} />
                      <div className={`absolute bottom-0 right-0 w-[3px] h-full rounded-full ${isAlreadyCaptured ? 'bg-emerald-300' : 'bg-blue-300'}`} />
                    </div>
                  </>
                )}

                {/* Scanning line animation for unrecognized */}
                {!isRecognized && (
                  <div className="absolute inset-x-0 top-0 h-full overflow-hidden rounded-xl">
                    <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-[scan_2s_ease-in-out_infinite]"
                      style={{ animation: 'scan 2s ease-in-out infinite' }}
                    />
                  </div>
                )}

                {/* Name label */}
                {isAlreadyCaptured ? (
                  <div className={`absolute -top-10 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-1.5 shadow-lg shadow-emerald-500/30 ${isMirror ? 'scale-x-[-1]' : ''}`}>
                    <CheckCircle2 size={12} />
                    {face.name} ✓
                  </div>
                ) : isRecognized ? (
                  <div className={`absolute -top-10 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-1.5 shadow-lg shadow-blue-500/30 animate-in fade-in slide-in-from-bottom-2 duration-300 ${isMirror ? 'scale-x-[-1]' : ''}`}>
                    <CheckCircle2 size={12} />
                    {face.name}
                  </div>
                ) : (
                  <div className={`absolute -bottom-9 left-1/2 -translate-x-1/2 bg-amber-500/90 backdrop-blur text-white text-[9px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-1.5 ${isMirror ? 'scale-x-[-1]' : ''}`}>
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    Identifying…
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Top gradient + header ── */}
      <div className="absolute top-0 inset-x-0 h-36 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none z-10" />

      <header className="relative z-30 flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md active:scale-90 transition-transform">
              <ArrowLeft size={20} className="text-white" />
            </button>
          )}
          <div>
            <span className="text-white text-[15px] font-bold tracking-tight">{title}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-slate-400 text-[10px] font-medium">Attendance</span>
              <span className="text-slate-500 text-[10px]">/</span>
              <span className="text-white/70 text-[10px] font-medium">Group Scan</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Live feed indicator */}
          {isScanning && !error && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wide">Live</span>
            </div>
          )}
          {count !== undefined && total !== undefined && (
            <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full">
              <span className="text-[13px] font-bold text-white tabular-nums">
                {count}<span className="text-white/40">/{total}</span>
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ── Bottom gradient ── */}
      <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-10" />

      {/* ── Spacer to push bottom controls down ── */}
      <div className="flex-1" />

      {/* ── Bottom controls area ── */}
      <div className="relative z-30 px-5 pb-[max(16px,env(safe-area-inset-bottom))] flex flex-col items-center gap-3">

        {/* Status chip */}
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 backdrop-blur-md rounded-full border border-slate-700">
          <Scan size={16} className="text-[#137fec]" />
          <p className="text-white text-sm font-medium">
            {error ? 'Camera error' : totalFacesInFrame > 0 ? `${totalFacesInFrame} Face${totalFacesInFrame > 1 ? 's' : ''} in frame` : statusText}
          </p>
        </div>

        {/* Recognized students strip */}
        {recognizedList && recognizedList.size > 0 && (
          <div className="w-full bg-white/8 backdrop-blur-xl border border-white/10 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{recognizedList.size} Marked Present</span>
              <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {Array.from(recognizedList.entries()).map(([id, info]) => (
                <div key={id} className="flex-shrink-0 w-10 h-10 rounded-full border-2 border-[#137fec]/50 overflow-hidden relative" title={info.name}>
                  <img src={info.avatar} className="w-full h-full object-cover" alt={info.name} />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-[1.5px] border-black" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last recognized toast */}
        {lastRecognized && (
          <div className="w-full bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 animate-in slide-in-from-bottom-4 fade-in duration-400">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-[#137fec] shrink-0">
                <img src={lastRecognized.avatar} alt="" className="w-full h-full object-cover" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-black" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-sm truncate">{lastRecognized.name}</h3>
                <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium mt-0.5">
                  <CheckCircle2 size={12} /> Attendance Marked
                </div>
              </div>
              <span className="text-white/50 text-[11px] font-medium tabular-nums">{lastRecognized.time}</span>
            </div>
          </div>
        )}

        {/* Action bar */}
        <div className="flex w-full items-center justify-between gap-3">
          {/* Camera flip */}
          <button onClick={toggleCamera}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-800/90 text-white border border-slate-700 active:scale-90 transition-transform backdrop-blur-md"
            aria-label="Switch camera"
          >
            <SwitchCamera size={20} />
          </button>

          {/* Bottom content from parent — contains Start/Pause + Finalize buttons */}
          <div className="flex-1">
            {bottomContent}
          </div>

          {/* Manual mode button */}
          {onBack && (
            <button onClick={onBack}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-800/90 text-white border border-slate-700 active:scale-90 transition-transform backdrop-blur-md relative"
              aria-label="Switch to manual"
            >
              <User size={20} />
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
