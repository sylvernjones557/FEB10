
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Scan, CheckCircle2, UserPlus, Fingerprint, Shield, ArrowRight, RotateCw, AlertCircle, Loader2 } from 'lucide-react';
import { BackButton } from '../constants';
import { data as dataApi, recognition } from '../services/api';

const ANGLES = ['Front', 'Left', 'Right'] as const;

const Enrollment: React.FC = () => {
  const [step, setStep] = useState(1);
  const [scanStep, setScanStep] = useState(0); // 0 = not started, 1 = Front, 2 = Left, 3 = Right
  const [angleStatus, setAngleStatus] = useState<('idle' | 'capturing' | 'done' | 'error')[]>(['idle', 'idle', 'idle']);
  const [formData, setFormData] = useState({ name: '', roll: '', standard: '', section: 'A' });
  const [studentId, setStudentId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<string | null>(null); // Stores duplicate face owner name
  const [isCreating, setIsCreating] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera when entering step 2
  useEffect(() => {
    if (step === 2) {
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      }).then(stream => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      }).catch(() => setErrorMsg('Camera access denied.'));
    }
    // Cleanup camera when leaving step 2
    return () => {
      if (step === 2 && streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [step]);

  /** Capture a JPEG blob from the video */
  const captureFrame = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return resolve(null);
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.5);
    });
  }, []);

  /** Create the student in DB, then move to step 2 */
  const handleProceedToScan = async () => {
    setErrorMsg(null);
    setIsCreating(true);
    try {
      // Generate a student ID from roll + class info
      const sid = `s-${formData.roll}-${formData.standard.replace(/\s+/g, '').toLowerCase()}${formData.section.toLowerCase()}`;
      
      // Determine class_id – map standard+section to an existing class
      const classMap: Record<string, string> = {
        '1stA': 'c1', '1stB': 'c2',
        '2ndA': 'c3', '2ndB': 'c4',
        '3rdA': 'c5', '3rdB': 'c6',
      };
      const classKey = `${formData.standard.replace(/\s+Standard/i, '').trim()}${formData.section}`;
      const classId = classMap[classKey] || 'c1';

      await dataApi.addStudent({
        id: sid,
        organization_id: 'org-1',
        name: formData.name,
        role: 'MEMBER',
        group_id: classId,
        external_id: formData.roll,
      });
      setStudentId(sid);
      setStep(2);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail && typeof detail === 'string' && detail.includes('already exists')) {
        // Student exists — allow re-registration of face
        const sid = `s-${formData.roll}-${formData.standard.replace(/\s+/g, '').toLowerCase()}${formData.section.toLowerCase()}`;
        setStudentId(sid);
        setStep(2);
      } else {
        setErrorMsg(detail || 'Failed to create student record.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  /** Start the 3-angle face capture process */
  const startScan = () => {
    setScanStep(1);
    setAngleStatus(['capturing', 'idle', 'idle']);
    setErrorMsg(null);
  };

  /** Capture current angle and register with backend */
  const captureCurrentAngle = async () => {
    const idx = scanStep - 1; // 0, 1, or 2
    if (idx < 0 || idx > 2) return;

    // Mark capturing
    setAngleStatus(prev => { const n = [...prev]; n[idx] = 'capturing'; return n; });
    setErrorMsg(null);

    try {
      const blob = await captureFrame();
      if (!blob) throw new Error('Failed to capture frame');

      await recognition.registerFace(studentId, blob);

      // Mark done
      setAngleStatus(prev => { const n = [...prev]; n[idx] = 'done'; return n; });

      // Advance to next angle or finish
      if (scanStep < 3) {
        setScanStep(scanStep + 1);
        setAngleStatus(prev => { const n = [...prev]; n[idx] = 'done'; n[idx + 1] = 'idle'; return n; });
      } else {
        // All 3 angles captured — success! Stop camera and go to step 3
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
        setTimeout(() => setStep(3), 800);
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Face registration failed. Try again.';
      const status = err?.response?.status;

      // Duplicate face detected — stop the entire registration flow
      if (status === 409 || (typeof detail === 'string' && detail.includes('DUPLICATE_FACE'))) {
        // Extract the name from "DUPLICATE_FACE: This face is already registered to "Name"..."
        const nameMatch = detail.match(/registered to "([^"]+)"/);
        const ownerName = nameMatch ? nameMatch[1] : 'another student';
        setDuplicateInfo(ownerName);
        setErrorMsg(null);
        // Stop camera
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t: MediaStreamTrack) => t.stop());
          streamRef.current = null;
        }
        return; // Stop — do NOT continue to next angle
      }

      setErrorMsg(detail);
      setAngleStatus(prev => { const n = [...prev]; n[idx] = 'error'; return n; });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <BackButton onClick={() => {
        if (step === 2 && scanStep === 0) { setStep(1); return; }
        if (step > 1) { setStep(step - 1); setScanStep(0); setAngleStatus(['idle','idle','idle']); setErrorMsg(null); }
      }} />
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-white tracking-tight">Pupil Admission & Biometrics</h2>
        <p className="text-slate-400">Register new students with high-fidelity face recognition.</p>
      </div>

      <div className="glass p-8 lg:p-12 rounded-[3rem] border border-slate-800 shadow-2xl min-h-[500px] flex flex-col">
        {step === 1 && (
          <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Student Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl p-4 text-white focus:border-indigo-600 transition-all" placeholder="Enter full name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Roll Number</label>
                  <input type="text" value={formData.roll} onChange={e => setFormData({...formData, roll: e.target.value})} className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl p-4 text-white focus:border-indigo-600 transition-all" placeholder="e.g. 101" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Standard</label>
                  <select value={formData.standard} onChange={e => setFormData({...formData, standard: e.target.value})} className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl p-4 text-white">
                    <option value="">Select Grade</option>
                    <option value="1st">1st Standard</option>
                    <option value="2nd">2nd Standard</option>
                    <option value="3rd">3rd Standard</option>
                    <option value="4th">4th Standard</option>
                    <option value="5th">5th Standard</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Section</label>
                <div className="flex gap-4">
                   {['A', 'B'].map(sec => (
                     <button key={sec} onClick={() => setFormData({...formData, section: sec as any})} className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${formData.section === sec ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                       Section {sec}
                     </button>
                   ))}
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold">
                <AlertCircle size={18} /> {errorMsg}
              </div>
            )}

            <button onClick={handleProceedToScan} disabled={!formData.name || !formData.standard || !formData.roll || isCreating} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 group">
              {isCreating ? <><Loader2 size={20} className="animate-spin" /> Creating Student…</> : <>PROCEED TO CAMERA SCAN <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex flex-col gap-8">
            <div className="relative w-full aspect-video bg-slate-950 rounded-[2rem] overflow-hidden border-2 border-slate-800">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              
              {/* Scanning overlay */}
              {scanStep > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                   {/* Modern face scanning frame */}
                   <div className="relative w-64 h-64">
                     {/* Outer glow ring */}
                     <div className="absolute inset-0 rounded-[2rem] border-2 border-indigo-400/30" style={{ animation: 'face-ring-pulse 2s ease-in-out infinite' }} />
                     {/* Corner brackets */}
                     <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-indigo-400 rounded-tl-xl" />
                     <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-indigo-400 rounded-tr-xl" />
                     <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-indigo-400 rounded-bl-xl" />
                     <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-indigo-400 rounded-br-xl" />
                     {/* Scanning line */}
                     <div className="absolute inset-x-2 top-2 bottom-2 overflow-hidden rounded-xl">
                       <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-400 to-transparent" style={{ animation: 'scan 2s ease-in-out infinite' }} />
                     </div>
                     {/* Center crosshair dot */}
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-indigo-400/50 animate-ping" />
                   </div>
                   <div className="mt-6 bg-black/60 backdrop-blur-md px-6 py-2.5 rounded-xl border border-white/10">
                     <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest">
                       {scanStep === 1 ? '📷 Look Straight' : scanStep === 2 ? '← Turn Left Slightly' : 'Turn Right Slightly →'}
                     </p>
                   </div>
                </div>
              )}

              {/* Begin button */}
              {scanStep === 0 && (
                <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center backdrop-blur-sm">
                  <button onClick={startScan} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-2xl hover:bg-indigo-500 transition-all flex items-center gap-2">
                    <Camera size={20} /> BEGIN SCAN
                  </button>
                </div>
              )}
            </div>

            {/* Error message */}
            {errorMsg && !duplicateInfo && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold">
                <AlertCircle size={18} /> {errorMsg}
              </div>
            )}

            {/* Duplicate face detected — full stop UI */}
            {duplicateInfo && (
              <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 text-center">
                <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                  <Shield size={32} className="text-rose-400" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-lg font-bold text-rose-400">Duplicate Face Detected</h4>
                  <p className="text-sm text-rose-300/80">
                    This face is already registered to <strong className="text-white">{duplicateInfo}</strong>.
                    Each student must have a unique face for accurate attendance tracking.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setDuplicateInfo(null);
                    setStep(1);
                    setScanStep(0);
                    setAngleStatus(['idle', 'idle', 'idle']);
                    setErrorMsg(null);
                    setStudentId('');
                  }}
                  className="px-6 py-3 bg-rose-500 hover:bg-rose-400 text-white rounded-xl font-bold transition-all flex items-center gap-2"
                >
                  <RotateCw size={16} /> Go Back & Try Different Student
                </button>
              </div>
            )}

            {/* Angle indicators + capture button */}
            {!duplicateInfo && (
            <div className="flex justify-between items-end px-10">
               {ANGLES.map((label, i) => (
                 <div key={label} className={`flex flex-col items-center gap-2 ${scanStep > i || angleStatus[i] === 'done' ? 'text-emerald-400' : scanStep === i + 1 ? 'text-indigo-400' : 'text-slate-600'}`}>
                    {angleStatus[i] === 'done' ? (
                      <CheckCircle2 size={24} />
                    ) : angleStatus[i] === 'capturing' ? (
                      <Loader2 size={24} className="animate-spin" />
                    ) : angleStatus[i] === 'error' ? (
                      <AlertCircle size={24} className="text-rose-500" />
                    ) : (
                      <RotateCw className={scanStep === i + 1 ? 'animate-spin' : ''} />
                    )}
                    <span className="text-[10px] font-bold uppercase">{label}</span>
                 </div>
               ))}
            </div>
            )}

            {/* Capture button — only visible when scanning is active and no duplicate */}
            {!duplicateInfo && scanStep > 0 && scanStep <= 3 && angleStatus[scanStep - 1] !== 'done' && (
              <button
                onClick={captureCurrentAngle}
                disabled={angleStatus[scanStep - 1] === 'capturing'}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                {angleStatus[scanStep - 1] === 'capturing' ? (
                  <><Loader2 size={20} className="animate-spin" /> Registering Face…</>
                ) : angleStatus[scanStep - 1] === 'error' ? (
                  <><RotateCw size={20} /> Retry Capture</>
                ) : (
                  <><Camera size={20} /> Capture {ANGLES[scanStep - 1]} Angle</>
                )}
              </button>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
             <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500"><CheckCircle2 size={40} /></div>
             <h3 className="text-2xl font-bold text-white">Pupil Registered</h3>
             <p className="text-slate-500 max-w-sm mx-auto">Admission for <strong>{formData.name}</strong> ({formData.standard} Standard - {formData.section}) is complete and biometrics are encrypted.</p>
             <button onClick={() => { setStep(1); setScanStep(0); setAngleStatus(['idle','idle','idle']); setFormData({ name: '', roll: '', standard: '', section: 'A' }); setStudentId(''); setErrorMsg(null); setDuplicateInfo(null); }} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/10 transition-all">NEW ADMISSION</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Enrollment;
