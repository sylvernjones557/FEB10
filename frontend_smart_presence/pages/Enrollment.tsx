
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Scan,
  CheckCircle2,
  UserPlus,
  Fingerprint,
  Shield,
  ArrowRight,
  RotateCw,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  Shapes,
  User,
  Hash,
  GraduationCap
} from 'lucide-react';
import { BackButton } from '../constants';
import { data as dataApi, recognition } from '../services/api';
import { haptics } from '../services/haptics';

const ANGLES = ['Front View', 'Left Profile', 'Right Profile'] as const;

const Enrollment: React.FC = () => {
  const [step, setStep] = useState(1);
  const [scanStep, setScanStep] = useState(0);
  const [angleStatus, setAngleStatus] = useState<('idle' | 'capturing' | 'done' | 'error')[]>(['idle', 'idle', 'idle']);
  const [formData, setFormData] = useState({ name: '', roll: '', standard: '', section: 'A' });
  const [studentId, setStudentId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (step === 2) {
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      }).then(stream => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      }).catch(() => setErrorMsg('Camera access denied.'));
    }
    return () => {
      if (step === 2 && streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [step]);

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
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
    });
  }, []);

  const handleProceedToScan = async () => {
    setErrorMsg(null);
    setIsCreating(true);
    haptics.impactMedium();
    try {
      const sid = `s-${formData.roll}-${formData.standard.replace(/\s+/g, '').toLowerCase()}${formData.section.toLowerCase()}`;
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

  const startScan = () => {
    haptics.impactHeavy();
    setScanStep(1);
    setAngleStatus(['capturing', 'idle', 'idle']);
    setErrorMsg(null);
  };

  const captureCurrentAngle = async () => {
    const idx = scanStep - 1;
    if (idx < 0 || idx > 2) return;

    setAngleStatus(prev => { const n = [...prev]; n[idx] = 'capturing'; return n; });
    haptics.impactLight();
    setErrorMsg(null);

    try {
      const blob = await captureFrame();
      if (!blob) throw new Error('Failed to capture frame');

      await recognition.registerFace(studentId, blob);

      haptics.notificationSuccess();
      setAngleStatus(prev => { const n = [...prev]; n[idx] = 'done'; return n; });

      if (scanStep < 3) {
        setScanStep(scanStep + 1);
        setAngleStatus(prev => { const n = [...prev]; n[idx] = 'done'; n[idx + 1] = 'idle'; return n; });
      } else {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
        setTimeout(() => setStep(3), 800);
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Face registration failed. Try again.';
      const status = err?.response?.status;

      if (status === 409 || (typeof detail === 'string' && detail.includes('DUPLICATE_FACE'))) {
        const nameMatch = detail.match(/registered to "([^"]+)"/);
        const ownerName = nameMatch ? nameMatch[1] : 'another student';
        setDuplicateInfo(ownerName);
        setErrorMsg(null);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t: MediaStreamTrack) => t.stop());
          streamRef.current = null;
        }
        haptics.notificationWarning();
        return;
      }

      haptics.notificationError();
      setErrorMsg(detail);
      setAngleStatus(prev => { const n = [...prev]; n[idx] = 'error'; return n; });
    }
  };

  return (
    <div className="space-y-10 page-enter font-main pb-20">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <BackButton onClick={() => {
            if (step === 2 && scanStep === 0) { setStep(1); return; }
            if (step > 1) { setStep(step - 1); setScanStep(0); setAngleStatus(['idle', 'idle', 'idle']); setErrorMsg(null); }
          }} />
          <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900/60 p-2 rounded-2xl border border-slate-200 dark:border-slate-800/50">
            <ShieldCheck size={18} className="text-indigo-600" />
            <span className="text-[10px] font-black text-slate-900 dark:text-white tracking-widest uppercase">Secure Admission</span>
          </div>
        </div>

        <div className="text-left">
          <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.4em] mb-2">Biometric Onboarding</p>
          <h2 className="text-4xl font-display font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">
            {step === 1 ? 'Pupil Profile' : step === 2 ? 'Face Geometry' : 'Success'}
          </h2>
        </div>
      </div>

      <div className="glass-card p-10 rounded-[3.5rem] relative overflow-hidden">
        {step === 1 && (
          <div className="space-y-10 animate-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Student Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full h-16 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-2xl pl-14 pr-6 text-slate-900 dark:text-white font-black text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      placeholder="Rahul Sharma"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Registration ID</label>
                    <div className="relative group">
                      <Hash className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                      <input
                        type="text"
                        value={formData.roll}
                        onChange={e => setFormData({ ...formData, roll: e.target.value })}
                        className="w-full h-16 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-2xl pl-14 pr-6 text-slate-900 dark:text-white font-black text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                        placeholder="e.g. 1042"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Academic Grade</label>
                    <div className="relative group">
                      <GraduationCap className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                      <select
                        value={formData.standard}
                        onChange={e => setFormData({ ...formData, standard: e.target.value })}
                        className="w-full h-16 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-2xl pl-14 pr-10 text-slate-900 dark:text-white font-black text-sm outline-none appearance-none focus:border-indigo-600 transition-all cursor-pointer"
                      >
                        <option value="">Select Grade</option>
                        <option value="1st">1st Standard</option>
                        <option value="2nd">2nd Standard</option>
                        <option value="3rd">3rd Standard</option>
                        <option value="4th">4th Standard</option>
                        <option value="5th">5th Standard</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Assigned Section</label>
                  <div className="flex gap-4 p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-[1.8rem]">
                    {['A', 'B'].map(sec => (
                      <button
                        key={sec}
                        onClick={() => { haptics.selection(); setFormData({ ...formData, section: sec as any }); }}
                        className={`flex-1 py-4 rounded-[1.2rem] font-display font-black text-[12px] transition-all uppercase tracking-widest ${formData.section === sec ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-indigo-500'}`}
                      >
                        Section {sec}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/60 p-8 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-[2rem] flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Fingerprint size={40} strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-xl font-display font-black text-slate-900 dark:text-white tracking-tight uppercase">High Fidelity</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 leading-relaxed">System will capture 3-angle geometry for 99.8% recognition accuracy.</p>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-5 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-4 text-sm font-black uppercase tracking-tight tabular-nums">
                <AlertCircle size={20} /> {errorMsg}
              </div>
            )}

            <button
              onClick={handleProceedToScan}
              disabled={!formData.name || !formData.standard || !formData.roll || isCreating}
              className="w-full py-6 bg-indigo-600 text-white font-display font-black rounded-[2rem] text-[13px] uppercase tracking-[0.3em] shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-4 disabled:opacity-40 tap-active hover:bg-slate-950 dark:hover:bg-indigo-500 transition-all saturate-[1.2]"
            >
              {isCreating ? <><Loader2 size={24} className="animate-spin" /> Authenticating...</> : <>Synchronize with Camera <ArrowRight size={22} /></>}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in">
            <div className="relative w-full aspect-video bg-slate-950 rounded-[3.5rem] overflow-hidden border border-slate-200 dark:border-slate-800/50 shadow-2xl group">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />

              {/* V4 Scanner Overlay */}
              {scanStep > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="relative w-72 h-72">
                    <div className="absolute inset-0 border-2 border-indigo-400/20 rounded-[3rem]" style={{ animation: 'face-ring-pulse 2s infinite' }}></div>
                    <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-indigo-500 rounded-tl-3xl"></div>
                    <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-indigo-500 rounded-tr-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-indigo-500 rounded-bl-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-indigo-500 rounded-br-3xl"></div>

                    <div className="absolute inset-4 overflow-hidden rounded-[2rem]">
                      <div className="scan-line"></div>
                    </div>
                  </div>

                  <div className="mt-10 bg-black/60 backdrop-blur-xl px-10 py-5 rounded-[2rem] border border-white/20">
                    <p className="text-white font-display font-black text-sm uppercase tracking-[0.4em]">
                      {scanStep === 1 ? '📷 Straight' : scanStep === 2 ? '← Left Profile' : 'Right Profile →'}
                    </p>
                  </div>
                </div>
              )}

              {scanStep === 0 && (
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md flex flex-col items-center justify-center text-center p-10 space-y-6">
                  <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-600/40 animate-bounce">
                    <Camera size={48} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-display font-black text-white tracking-tight uppercase">Optical Readiness</h3>
                    <p className="text-indigo-200/60 text-[10px] font-black uppercase tracking-[0.3em] mt-3">Ready to map biometric geometry</p>
                  </div>
                  <button onClick={startScan} className="px-12 py-5 bg-white text-indigo-600 rounded-[1.8rem] font-display font-black text-xs uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-xl">
                    Initiate Sequence
                  </button>
                </div>
              )}
            </div>

            {duplicateInfo && (
              <div className="p-10 rounded-[3rem] bg-rose-500/10 border-2 border-rose-500/30 text-center space-y-6 animate-in">
                <div className="w-20 h-20 bg-rose-500/20 rounded-[2rem] border-2 border-rose-400 flex items-center justify-center mx-auto shadow-2xl shadow-rose-500/20">
                  <Shield size={36} className="text-rose-500" />
                </div>
                <div>
                  <h4 className="text-2xl font-display font-black text-rose-500 tracking-tight uppercase">Duplicate Identity</h4>
                  <p className="text-slate-400 text-sm font-medium mt-3 max-w-sm mx-auto leading-relaxed">
                    Biometric profile already linked to <span className="text-white font-black">{duplicateInfo}</span>. Access Denied.
                  </p>
                </div>
                <button onClick={() => { setDuplicateInfo(null); setStep(1); }} className="px-10 py-4 bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest tap-active">
                  Resolve Conflict
                </button>
              </div>
            )}

            {!duplicateInfo && (
              <div className="space-y-10">
                <div className="grid grid-cols-3 gap-6">
                  {ANGLES.map((label, i) => (
                    <div key={label} className="space-y-4">
                      <div className={`h-2 rounded-full transition-all duration-700 ${angleStatus[i] === 'done' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : scanStep === i + 1 ? 'bg-indigo-600 animate-pulse' : 'bg-slate-100 dark:bg-slate-800'}`}></div>
                      <div className="flex flex-col items-center gap-2">
                        {angleStatus[i] === 'done' ? <ShieldCheck size={20} className="text-emerald-500" /> : <Shapes size={20} className="text-slate-300" />}
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {scanStep > 0 && scanStep <= 3 && angleStatus[scanStep - 1] !== 'done' && (
                  <button onClick={captureCurrentAngle} disabled={angleStatus[scanStep - 1] === 'capturing'} className="w-full py-6 bg-indigo-600 text-white font-display font-black rounded-[2rem] text-[13px] uppercase tracking-[0.3em] shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-4 tap-active saturate-[1.2]">
                    {angleStatus[scanStep - 1] === 'capturing' ? <Loader2 size={24} className="animate-spin" /> : <><Camera size={24} /> Capture Optical Signal</>}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-10 animate-in">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full scale-150 animate-pulse"></div>
              <div className="relative w-32 h-32 bg-emerald-500 rounded-[3rem] shadow-2xl shadow-emerald-500/40 flex items-center justify-center text-white rotate-3 hover:rotate-0 transition-transform duration-500">
                <CheckCircle2 size={64} strokeWidth={2.5} />
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-5xl font-display font-black text-slate-900 dark:text-white tracking-tight uppercase">Success</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium max-w-sm mx-auto leading-relaxed">
                Admission for <span className="text-indigo-600 dark:text-indigo-400 font-black">{formData.name}</span> has been processed and biometric seeds are deployed.
              </p>
            </div>
            <button onClick={() => { setStep(1); setScanStep(0); setAngleStatus(['idle', 'idle', 'idle']); setFormData({ name: '', roll: '', standard: '', section: 'A' }); setStudentId(''); setErrorMsg(null); setDuplicateInfo(null); }} className="px-12 py-5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-display font-black rounded-3xl text-[12px] uppercase tracking-[0.3em] shadow-2xl tap-active hover:scale-105 transition-transform">
              New Admission
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {[
          { label: 'Secure', icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
          { label: 'Verified', icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-500/10' },
          { label: 'Encrypted', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-500/10' }
        ].map((feat, i) => (
          <div key={i} className="flex flex-col items-center gap-3">
            <div className={`w-14 h-14 ${feat.bg} rounded-2xl flex items-center justify-center ${feat.color}`}>
              <feat.icon size={24} />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{feat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Enrollment;
