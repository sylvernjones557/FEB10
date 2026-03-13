
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronRight,
  Camera,
  CheckCircle2,
  Lock,
  User,
  Layers,
  Key,
  Calendar,
  BookOpen,
  Clock,
  ImagePlus,
  AlertCircle,
  Loader2,
  RotateCw,
  ArrowLeft,
  SwitchCamera
} from 'lucide-react';
import { BackButton, MOCK_CLASSES } from '../constants';
import { StaffMember, Student, StaffType, DaySchedule } from '../types';
import { recognition } from '../services/api';
import { useToast } from '../components/Toast';

interface SettingsProps {
  onBack: () => void;
  onAddStaff: (s: StaffMember) => void;
  onAddStudent: (s: Student) => void;
  staffList?: StaffMember[];
  groupList?: any[];
}

const SettingsPage: React.FC<SettingsProps> = ({ onBack, onAddStaff, onAddStudent, staffList = [], groupList = MOCK_CLASSES }) => {
  // Find classes that already have an assigned class teacher
  const assignedClassIds = staffList
    .filter(s => s.type === 'CLASS_TEACHER' && s.assignedClassId)
    .map(s => s.assignedClassId);

  // Helper to format class label
  const formatClassLabel = (c: typeof MOCK_CLASSES[0]) => {
    return c.code ? `${c.name} (${c.code})` : c.name;
  };
  const [activeTab, setActiveTab] = useState<'STAFF' | 'STUDENT'>('STAFF');
  const [step, setStep] = useState(1);
  const [scanStep, setScanStep] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const avatarVideoRef = useRef<HTMLVideoElement>(null);
  const avatarStreamRef = useRef<MediaStream | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarCameraOpen, setAvatarCameraOpen] = useState(false);
  const [avatarFacing, setAvatarFacing] = useState<'user' | 'environment'>('user');
  const [avatarCountdown, setAvatarCountdown] = useState<number | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [useUploadFallback, setUseUploadFallback] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [anglesDone, setAnglesDone] = useState<boolean[]>([false, false, false]);
  const [regFacingMode, setRegFacingMode] = useState<'user' | 'environment'>('user');
  const [autoCapStatus, setAutoCapStatus] = useState<'scanning' | 'detected' | 'captured' | null>(null);
  const [staffFormError, setStaffFormError] = useState<string | null>(null);
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const { showToast } = useToast();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // ── Full-screen avatar camera logic ──
  const openAvatarCamera = async () => {
    setAvatarCameraOpen(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: avatarFacing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      avatarStreamRef.current = s;
      if (avatarVideoRef.current) {
        avatarVideoRef.current.srcObject = s;
      }
    } catch {
      // Camera not available — fall back to file upload
      setAvatarCameraOpen(false);
      avatarInputRef.current?.click();
    }
  };

  const closeAvatarCamera = () => {
    if (avatarStreamRef.current) {
      avatarStreamRef.current.getTracks().forEach(t => t.stop());
      avatarStreamRef.current = null;
    }
    setAvatarCameraOpen(false);
    setAvatarCountdown(null);
  };

  const captureAvatarPhoto = () => {
    const video = avatarVideoRef.current;
    if (!video || video.readyState < 2) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setAvatarPreview(dataUrl);
    closeAvatarCamera();
  };

  const handleAvatarCapture = () => {
    // 3-second countdown before capture
    setAvatarCountdown(3);
    let count = 3;
    const iv = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(iv);
        setAvatarCountdown(null);
        captureAvatarPhoto();
      } else {
        setAvatarCountdown(count);
      }
    }, 1000);
  };

  // Sync avatar video ref when camera opens
  useEffect(() => {
    if (avatarCameraOpen && avatarVideoRef.current && avatarStreamRef.current) {
      avatarVideoRef.current.srcObject = avatarStreamRef.current;
    }
  }, [avatarCameraOpen]);

  // Switch avatar camera facing mode
  useEffect(() => {
    if (!avatarCameraOpen) return;
    let cancelled = false;
    (async () => {
      if (avatarStreamRef.current) {
        avatarStreamRef.current.getTracks().forEach(t => t.stop());
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: avatarFacing, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false
        });
        if (cancelled) { s.getTracks().forEach(t => t.stop()); return; }
        avatarStreamRef.current = s;
        if (avatarVideoRef.current) avatarVideoRef.current.srcObject = s;
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [avatarFacing, avatarCameraOpen]);

  const [staffForm, setStaffForm] = useState({
    name: '', email: '', username: '', password: '', type: 'CLASS_TEACHER' as StaffType,
    subject: '', classId: groupList[0]?.id || MOCK_CLASSES[0].id
  });

  const [studentForm, setStudentForm] = useState({
    name: '', roll: '', classId: groupList[0]?.id || MOCK_CLASSES[0].id, section: 'A'
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const [timetable, setTimetable] = useState<DaySchedule[]>(
    days.map(day => ({
      day,
      periods: [
        { period: 1, subject: '', classId: '' },
        { period: 2, subject: '', classId: '' },
        { period: 3, subject: '', classId: '' }
      ]
    }))
  );

  // ── Helpers (defined before effects that depend on them) ──

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
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
    });
  }, []);

  const updateTimetable = (dayIndex: number, periodIndex: number, field: string, value: string) => {
    const newTimetable = [...timetable];
    newTimetable[dayIndex].periods[periodIndex] = { ...newTimetable[dayIndex].periods[periodIndex], [field]: value };
    setTimetable(newTimetable);
  };

  const startScanSequence = () => {
    setScanStep(1);
    setScanProgress(0);
    setScanError(null);
    setAnglesDone([false, false, false]);
  };

  const finalizeStudent = useCallback(() => {
    showToast('success', 'New Student Registered', `${studentForm.name} has been enrolled successfully`);
    setStep(4);
  }, [showToast, studentForm.name]);

  const registerCurrentAngle = async (blob: Blob) => {
    const idx = scanStep - 1;
    if (idx < 0 || idx > 2) return;

    const studentId = studentForm.roll;
    await recognition.registerFace(studentId, blob);

    const newDone = [...anglesDone];
    newDone[idx] = true;
    setAnglesDone(newDone);
    setScanProgress(Math.round(((idx + 1) / 3) * 100));

    if (scanStep < 3) {
      setScanStep(scanStep + 1);
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      finalizeStudent();
    }
  };

  const uploadCurrentAngle = async (file: File | null) => {
    const idx = scanStep - 1;
    if (idx < 0 || idx > 2 || !file) return;
    setIsCapturing(true);
    setScanError(null);

    try {
      await registerCurrentAngle(file);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Face registration failed. Ensure your face is clearly visible.';
      setScanError(detail);
    } finally {
      setIsCapturing(false);
      if (uploadInputRef.current) uploadInputRef.current.value = '';
    }
  };

  // ── Camera initialization effect ──
  useEffect(() => {
    if (step === 2 && activeTab === 'STUDENT') {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const hasSecureContext = window.isSecureContext || isLocalhost;

      if (!hasSecureContext) {
        setUseUploadFallback(true);
        setScanError('Live camera on mobile requires HTTPS. Use upload capture below or open app via HTTPS for live scan.');
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setUseUploadFallback(true);
        setScanError('Live camera API is unavailable on this device/browser. Use upload capture below.');
        return;
      }

      setUseUploadFallback(false);

      navigator.mediaDevices.getUserMedia({
        video: { facingMode: regFacingMode, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
      })
        .then(stream => {
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(err => {
          console.error(err);
          if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
            setScanError('Camera permission denied. Please allow camera access in browser settings.');
          } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
            setScanError('Camera is busy in another app. Close other camera apps and retry.');
          } else {
            setScanError('Could not start camera. Ensure HTTPS is used on mobile and retry.');
          }
        });
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [step, activeTab, regFacingMode]);

  // ── Auto-capture loop: automatically detect face & register each angle ──
  useEffect(() => {
    if (step !== 2 || activeTab !== 'STUDENT' || scanStep < 1 || scanStep > 3 || useUploadFallback) {
      setAutoCapStatus(null);
      return;
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    setAutoCapStatus('scanning');

    const attemptCapture = async () => {
      if (cancelled) return;
      try {
        const blob = await captureFrame();
        if (!blob || cancelled) {
          if (!cancelled) retryTimer = setTimeout(attemptCapture, 1500);
          return;
        }

        if (cancelled) return;
        setAutoCapStatus('detected');

        const studentId = studentForm.roll;
        await recognition.registerFace(studentId, blob);
        if (cancelled) return;

        // Face detected & registered successfully
        setAutoCapStatus('captured');
        setScanError(null);

        const idx = scanStep - 1;
        setAnglesDone(prev => {
          const nd = [...prev];
          nd[idx] = true;
          return nd;
        });
        setScanProgress(Math.round(((idx + 1) / 3) * 100));

        // Brief visual pause to show success
        await new Promise(r => setTimeout(r, 800));
        if (cancelled) return;

        if (scanStep < 3) {
          setScanStep(scanStep + 1);
        } else {
          // All angles captured
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
          }
          showToast('success', 'New Student Registered', `${studentForm.name} has been enrolled successfully`);
          setStep(4);
        }
      } catch (_e) {
        // No face detected or registration error — retry
        if (!cancelled) {
          setAutoCapStatus('scanning');
          retryTimer = setTimeout(attemptCapture, 2000);
        }
      }
    };

    // Start after camera warm-up delay
    const startTimer = setTimeout(attemptCapture, 1200);
    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      if (retryTimer) clearTimeout(retryTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanStep, step, activeTab, useUploadFallback, captureFrame]);

  const finalizeStaff = async () => {
    setIsSavingStaff(true);
    try {
      // Construct payload for API (UserCreate schema)
      const newStaff = {
        staff_code: staffForm.username,
        password: staffForm.password,
        full_name: staffForm.name,
        email: staffForm.email,
        role: 'STAFF',
        type: staffForm.type,
        primary_subject: staffForm.subject,
        assigned_class_id: staffForm.classId,
        avatar_url: avatarPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(staffForm.name || 'S')}&background=6366F1&color=fff&size=150&bold=true`
      };
      await onAddStaff(newStaff as any);

      // Submit timetable entries to backend
      const dayMap: Record<string, number> = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5 };
      try {
        const { data: timetableApi } = await import('../services/api');
        for (const day of timetable) {
          const dayOfWeek = dayMap[day.day];
          if (!dayOfWeek) continue;
          for (const period of day.periods) {
            if (period.subject && period.classId) {
              await timetableApi.addTimetableEntry({
                group_id: period.classId,
                staff_id: undefined, // Will be filled server-side if needed
                day_of_week: dayOfWeek,
                period: period.period,
                subject: period.subject,
              });
            }
          }
        }
      } catch (e) {
        console.error('Failed to save timetable entries', e);
      }

      showToast('success', 'Teacher Added', `${staffForm.name} has been registered with schedule`);
      setStep(4);
    } catch (e: any) {
      showToast('error', 'Failed', e?.response?.data?.detail || 'Could not save teacher.');
    } finally {
      setIsSavingStaff(false);
    }
  };

  const guideColor = autoCapStatus === 'captured' ? '#10b981' : '#137fec';

  return (
    <>
    <div className="max-w-xl mx-auto space-y-8 pb-24 page-enter">
      <div className="flex flex-col gap-4 px-1">
        <BackButton onClick={onBack} />
        <div className="flex bg-white dark:bg-slate-900 p-2 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm w-full">
          <button onClick={() => { setActiveTab('STAFF'); setStep(1); }} className={`flex-1 py-4 rounded-[1.5rem] text-[11px] font-bold tracking-widest transition-all ${activeTab === 'STAFF' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 hover:text-indigo-500'}`}>ADD TEACHER</button>
          <button onClick={() => { setActiveTab('STUDENT'); setStep(1); }} className={`flex-1 py-4 rounded-[1.5rem] text-[11px] font-bold tracking-widest transition-all ${activeTab === 'STUDENT' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 hover:text-indigo-500'}`}>ADD MEMBER</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
        {step === 1 && (
          <div className="space-y-8 animate-in slide-in-from-bottom-6">
            <div className="text-center">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{activeTab === 'STAFF' ? 'Teacher Info' : 'Member Info'}</h3>
              <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Fill in the details</p>
            </div>

            {/* AVATAR UPLOAD / CAMERA CAPTURE */}
            {activeTab === 'STAFF' && (
              <div className="flex flex-col items-center gap-3">
                <div
                  onClick={openAvatarCamera}
                  className="relative w-32 h-32 rounded-[2rem] border-[3px] border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50 dark:bg-slate-950 flex items-center justify-center cursor-pointer group transition-all duration-300 overflow-hidden shadow-inner"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors">
                      <Camera size={32} strokeWidth={1.5} />
                      <span className="text-[9px] font-bold uppercase tracking-widest">Take Photo</span>
                    </div>
                  )}
                  {avatarPreview && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Camera size={24} className="text-white" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={openAvatarCamera} className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800/40 flex items-center gap-1.5 active:scale-95 transition-transform">
                    <Camera size={12} /> Camera
                  </button>
                  <button type="button" onClick={() => avatarInputRef.current?.click()} className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 active:scale-95 transition-transform">
                    <ImagePlus size={12} /> Upload
                  </button>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Profile Photo</p>
              </div>
            )}

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-4">Name</label>
                <div className="relative">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700" size={18} />
                  <input type="text" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl py-5 pl-14 pr-6 text-slate-900 dark:text-white font-bold text-sm focus:border-indigo-600 outline-none shadow-inner transition-all" placeholder={activeTab === 'STAFF' ? 'e.g. Dr. Priya Sharma' : 'Enter member name'} value={activeTab === 'STAFF' ? staffForm.name : studentForm.name} onChange={e => activeTab === 'STAFF' ? setStaffForm({ ...staffForm, name: e.target.value }) : setStudentForm({ ...studentForm, name: e.target.value })} />
                </div>
              </div>

              {activeTab === 'STAFF' ? (
                <div className="space-y-4 pt-2">
                  <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Personal Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* EMAIL INPUT */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-4">Email Address</label>
                      <div className="relative">
                        <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700" size={18} />
                        <input type="email" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-slate-900 dark:text-white font-bold text-sm focus:border-indigo-600 outline-none shadow-inner transition-all" placeholder="name@smartpresence.edu" value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })} />
                      </div>
                    </div>

                    {/* NAME INPUT (Moved here contextually if not already above, assuming previous block handles name) */}
                    {/* Note: Name is generic for both, so it's above this block. */}
                  </div>

                  <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1 pt-4">Academic Role</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* STAFF TYPE */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-4">Role Type</label>
                      <div className="relative">
                        <Layers className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700" size={18} />
                        <select className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-slate-900 dark:text-white font-bold text-sm focus:border-indigo-600 outline-none shadow-inner appearance-none transition-all" value={staffForm.type} onChange={e => setStaffForm({ ...staffForm, type: e.target.value as StaffType })}>
                          <option value="CLASS_TEACHER">Class Teacher</option>
                          <option value="SUBJECT_TEACHER">Subject Teacher</option>
                        </select>
                      </div>
                    </div>

                    {/* PRIMARY SUBJECT - only for SUBJECT_TEACHER */}
                    {staffForm.type === 'SUBJECT_TEACHER' && (
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-4">Primary Subject</label>
                        <div className="relative">
                          <BookOpen className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700" size={18} />
                          <input type="text" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-slate-900 dark:text-white font-bold text-sm focus:border-indigo-600 outline-none shadow-inner transition-all" placeholder="e.g. Mathematics" value={staffForm.subject} onChange={e => setStaffForm({ ...staffForm, subject: e.target.value })} />
                        </div>
                      </div>
                    )}

                    {/* ASSIGNED CLASS - only show for CLASS_TEACHER, filter already assigned */}
                    {staffForm.type === 'CLASS_TEACHER' && (
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-4">Assigned Class</label>
                        <div className="relative">
                          <Layers className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700" size={18} />
                          <select className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-slate-900 dark:text-white font-bold text-sm focus:border-indigo-600 outline-none shadow-inner appearance-none transition-all" value={staffForm.classId} onChange={e => setStaffForm({ ...staffForm, classId: e.target.value })}>
                            <option value="">Select a class</option>
                            {groupList.map(c => {
                              const isAssigned = assignedClassIds.includes(c.id);
                              return (
                                <option key={c.id} value={c.id} disabled={isAssigned}>
                                  {formatClassLabel(c)}{isAssigned ? ' ✓ Already Assigned' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        {groupList.filter(c => !assignedClassIds.includes(c.id)).length === 0 && (
                          <p className="text-[10px] font-bold text-amber-500 ml-4">⚠ All classes have been assigned to a teacher</p>
                        )}
                      </div>
                    )}
                  </div>

                  <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1 pt-4">Account Credentials</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* LOGIN ID */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-4">Login ID</label>
                      <div className="relative">
                        <Key className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700" size={18} />
                        <input type="text" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-slate-900 dark:text-white font-bold text-sm focus:border-indigo-600 outline-none shadow-inner transition-all" placeholder="e.g. priya.sharma (used for login)" value={staffForm.username} onChange={e => setStaffForm({ ...staffForm, username: e.target.value })} />
                      </div>
                    </div>

                    {/* PASSWORD */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-4">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700" size={18} />
                        <input type="password" placeholder="Min. 6 characters" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-slate-900 dark:text-white font-bold text-sm focus:border-indigo-600 outline-none shadow-inner transition-all" value={staffForm.password} onChange={e => setStaffForm({ ...staffForm, password: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-4">ID Number</label>
                    <input type="text" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 text-slate-900 dark:text-white font-bold text-sm focus:border-indigo-600 outline-none shadow-inner transition-all" placeholder="Enter ID" value={studentForm.roll} onChange={e => setStudentForm({ ...studentForm, roll: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-4">Select Class</label>
                    <select className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 text-slate-900 dark:text-white font-bold text-sm focus:border-indigo-600 outline-none shadow-inner appearance-none transition-all" value={studentForm.classId} onChange={e => setStudentForm({ ...studentForm, classId: e.target.value })}>
                      {groupList.map(c => <option key={c.id} value={c.id}>{formatClassLabel(c)}</option>)}
                    </select>
                  </div>
                </>
              )}

              {/* Validation error message */}
              {staffFormError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold mt-2">
                  <AlertCircle size={14} /> {staffFormError}
                </div>
              )}
              {scanError && activeTab === 'STUDENT' && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold mt-2">
                  <AlertCircle size={14} /> {scanError}
                </div>
              )}

              <button onClick={async () => {
                setStaffFormError(null);
                setScanError(null);
                if (activeTab === 'STUDENT') {
                  // Validate student fields
                  if (!studentForm.name.trim()) { setScanError('Please enter the student name.'); return; }
                  if (!studentForm.roll.trim()) { setScanError('Please enter the student ID.'); return; }
                  if (!studentForm.classId) { setScanError('Please select a class.'); return; }
                  // Create student in DB first, then go to face scan
                  try {
                    const newMember = {
                      id: studentForm.roll,
                      organization_id: 'org-1',
                      name: studentForm.name,
                      role: 'MEMBER',
                      group_id: studentForm.classId,
                      external_id: studentForm.roll,
                    };
                    onAddStudent(newMember as any);
                  } catch (err: any) {
                    // If student already exists, that's OK — we can re-register face
                    const detail = err?.response?.data?.detail;
                    if (detail && !detail.includes('already exists')) {
                      setScanError(detail);
                      return;
                    }
                  }
                  setStep(2);
                } else {
                  // Validate staff fields before proceeding to timetable
                  if (!staffForm.name.trim()) { setStaffFormError('Please enter the teacher name.'); return; }
                  if (!staffForm.username.trim()) { setStaffFormError('Please enter a Login ID.'); return; }
                  if (!staffForm.password || staffForm.password.length < 6) { setStaffFormError('Password must be at least 6 characters.'); return; }
                  if (staffForm.type === 'SUBJECT_TEACHER' && !staffForm.subject.trim()) { setStaffFormError('Please enter the primary subject.'); return; }
                  if (staffForm.type === 'CLASS_TEACHER' && !staffForm.classId) { setStaffFormError('Please select an assigned class.'); return; }
                  setStep(2);
                }
              }} className="w-full py-5 rounded-2xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 mt-4 flex items-center justify-center gap-3">
                Next <ChevronRight size={18} strokeWidth={3} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && activeTab === 'STAFF' && createPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 shadow-sm">
              <div className="flex items-center justify-between max-w-2xl mx-auto">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 active:scale-90 transition-transform"
                  >
                    <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
                  </button>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Teacher Schedule</h3>
                    <p className="text-slate-400 dark:text-slate-500 text-[9px] font-bold uppercase tracking-widest">{staffForm.name || 'New Teacher'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-800/40">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{staffForm.type === 'CLASS_TEACHER' ? 'Class Teacher' : 'Subject Teacher'}</span>
                  </div>
                </div>
              </div>
            </header>

            {/* Scrollable timetable body */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
                {timetable.map((day, dIdx) => (
                  <div key={day.day} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-800/50 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
                      <Calendar size={16} />
                      <h4 className="text-xs font-black uppercase tracking-widest">{day.day}</h4>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {day.periods.map((p, pIdx) => (
                        <div key={p.period} className="px-5 py-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Clock size={12} className="text-slate-400" />
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Period {p.period}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="relative">
                              <BookOpen size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700" />
                              <input
                                placeholder="Subject Name"
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl pl-10 pr-3 py-3 text-xs font-bold text-slate-900 dark:text-white focus:border-indigo-600 outline-none transition-all"
                                value={p.subject}
                                onChange={e => updateTimetable(dIdx, pIdx, 'subject', e.target.value)}
                              />
                            </div>
                            <div className="relative">
                              <Layers size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700" />
                              <select
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl pl-10 pr-3 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 outline-none appearance-none transition-all"
                                value={p.classId}
                                onChange={e => updateTimetable(dIdx, pIdx, 'classId', e.target.value)}
                              >
                                <option value="">Select Class</option>
                                {groupList.map(c => <option key={c.id} value={c.id}>{formatClassLabel(c)}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sticky bottom save */}
            <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
              <div className="max-w-2xl mx-auto">
                <button
                  onClick={finalizeStaff}
                  disabled={isSavingStaff}
                  className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2.5"
                >
                  {isSavingStaff ? (
                    <><Loader2 size={18} className="animate-spin" /> Saving…</>
                  ) : (
                    <><CheckCircle2 size={18} /> Save Schedule & Add Teacher</>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {step === 2 && activeTab === 'STUDENT' && createPortal(
          <div className="fixed inset-0 z-[9999] bg-black flex flex-col overflow-hidden">
            {/* ── Full-screen camera feed ── */}
            <div className="absolute inset-0">
              {!useUploadFallback ? (
                <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${regFacingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
              ) : (
                <div className="w-full h-full bg-gradient-to-b from-black via-[#0a1018] to-black" />
              )}
            </div>

            {/* Gradients */}
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none z-10" />
            <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-10" />

            {/* ── Header ── */}
            <header className="relative z-30 flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => { if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; } setScanStep(0); setScanError(null); setAnglesDone([false, false, false]); setScanProgress(0); setStep(1); }}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md active:scale-90 transition-transform"
                >
                  <ArrowLeft size={20} className="text-white" />
                </button>
                <span className="text-white text-[15px] font-semibold">Face Registration</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full">
                  <span className="text-[13px] font-bold text-white tabular-nums">{scanStep}<span className="text-white/40">/3</span></span>
                </div>
                {!useUploadFallback && (
                  <button
                    onClick={() => setRegFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md active:scale-90 transition-transform"
                    aria-label="Switch camera"
                  >
                    <SwitchCamera size={19} className="text-white" />
                  </button>
                )}
              </div>
            </header>

            {/* Progress bar */}
            <div className="relative z-30 mx-5 h-[3px] bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#137fec] rounded-full transition-all duration-700 ease-out" style={{ width: `${scanProgress}%` }} />
            </div>

            {/* ── Center: iPhone Face ID-style guide ── */}
            <div className="flex-1 relative z-20 flex flex-col items-center justify-center pointer-events-none">
              {scanStep === 0 ? (
                <div className="flex flex-col items-center gap-8 pointer-events-auto">
                  {/* Idle face outline */}
                  <svg width="240" height="310" viewBox="0 0 260 340" fill="none" className="opacity-60">
                    <rect x="4" y="4" width="252" height="332" rx="126" ry="140" stroke="white" strokeWidth="2.5" fill="none" strokeDasharray="12 8" />
                    <path d="M50 8 L8 8 Q4 8 4 12 L4 60" stroke="rgba(255,255,255,0.5)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                    <path d="M210 8 L252 8 Q256 8 256 12 L256 60" stroke="rgba(255,255,255,0.5)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                    <path d="M50 332 L8 332 Q4 332 4 328 L4 280" stroke="rgba(255,255,255,0.5)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                    <path d="M210 332 L252 332 Q256 332 256 328 L256 280" stroke="rgba(255,255,255,0.5)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                  </svg>
                  <button onClick={startScanSequence} className="h-[52px] px-10 bg-[#137fec] text-white rounded-2xl font-semibold text-[15px] tracking-wide transition-all active:scale-95 flex items-center gap-2.5">
                    <Camera size={20} /> Begin Face Scan
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  {/* Active face guide with scanning animation */}
                  <div className="relative face-guide-active">
                    <svg width="260" height="340" viewBox="0 0 260 340" fill="none" className={`drop-shadow-lg transition-all duration-500 ${autoCapStatus === 'captured' ? 'drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]' : ''}`}>
                      <rect x="4" y="4" width="252" height="332" rx="126" ry="140" stroke={guideColor} strokeWidth="3" fill="none" strokeLinecap="round" className="transition-all duration-500" />
                      <path d="M50 8 L8 8 Q4 8 4 12 L4 60" stroke={guideColor} strokeWidth="4" fill="none" strokeLinecap="round" className="transition-all duration-500" />
                      <path d="M210 8 L252 8 Q256 8 256 12 L256 60" stroke={guideColor} strokeWidth="4" fill="none" strokeLinecap="round" className="transition-all duration-500" />
                      <path d="M50 332 L8 332 Q4 332 4 328 L4 280" stroke={guideColor} strokeWidth="4" fill="none" strokeLinecap="round" className="transition-all duration-500" />
                      <path d="M210 332 L252 332 Q256 332 256 328 L256 280" stroke={guideColor} strokeWidth="4" fill="none" strokeLinecap="round" className="transition-all duration-500" />
                    </svg>
                    {/* Scanning sweep line (hidden when captured) */}
                    {!useUploadFallback && autoCapStatus !== 'captured' && (
                      <div className="absolute inset-x-8 top-1 bottom-1 overflow-hidden rounded-[126px]">
                        <div className="scan-line-sweep absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#137fec]/80 to-transparent blur-[1px]" />
                      </div>
                    )}
                    {/* Checkmark on successful capture */}
                    {autoCapStatus === 'captured' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <CheckCircle2 size={64} className="text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]" style={{ animation: 'slideInFromBottom 0.4s ease-out' }} />
                      </div>
                    )}
                    {/* Upload fallback overlay */}
                    {useUploadFallback && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Camera size={40} className="text-[#137fec] mb-2 opacity-80" />
                        <span className="text-3xl font-bold text-white/80 tabular-nums">{scanProgress}%</span>
                      </div>
                    )}
                  </div>

                  {/* Instruction — contextual per angle + auto-capture feedback */}
                  <div className={`mt-6 px-5 py-2.5 rounded-full backdrop-blur-md border transition-all duration-500 ${
                    autoCapStatus === 'captured' ? 'bg-emerald-500/20 border-emerald-500/30' :
                    autoCapStatus === 'detected' ? 'bg-amber-500/20 border-amber-500/30' :
                    'bg-[#137fec]/20 border-[#137fec]/30'
                  }`}>
                    <span className="text-white text-[13px] font-medium">
                      {autoCapStatus === 'captured' ? '✓ Captured!' :
                       autoCapStatus === 'detected' ? 'Hold still — registering…' :
                       scanStep === 1 ? 'Look straight at the camera' :
                       scanStep === 2 ? 'Slowly turn your head left' :
                       'Slowly turn your head right'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ── Bottom controls ── */}
            <div className="relative z-30 px-5 pb-[max(16px,env(safe-area-inset-bottom))]">
              {/* Error */}
              {scanError && (
                <div className="bg-rose-500/15 backdrop-blur-xl rounded-2xl border border-rose-500/20 p-3 flex items-center gap-2 text-rose-300 text-[13px] font-medium mb-3">
                  <AlertCircle size={16} /> {scanError}
                </div>
              )}

              {/* Angle progress */}
              {scanStep > 0 && (
                <div className="bg-white/8 backdrop-blur-xl border border-white/10 rounded-2xl p-4 mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white/40 text-[11px] font-semibold uppercase tracking-widest">Progress</span>
                    <span className="text-[#137fec] text-[13px] font-bold tabular-nums">{anglesDone.filter(Boolean).length}/3</span>
                  </div>
                  <div className="flex justify-center gap-6">
                    {['Front', 'Left', 'Right'].map((ang, i) => (
                      <div key={ang} className="flex flex-col items-center gap-1.5">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                          anglesDone[i] ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400' :
                          scanStep === i + 1 ? 'bg-[#137fec]/20 border-[#137fec] text-[#137fec] shadow-[0_0_12px_rgba(19,127,236,0.4)]' :
                          'bg-white/5 border-white/15 text-white/25'
                        }`}>
                          {anglesDone[i] ? <CheckCircle2 size={18} /> : <span className="text-sm font-bold">{i + 1}</span>}
                        </div>
                        <span className={`text-[9px] font-semibold uppercase tracking-wider ${anglesDone[i] ? 'text-emerald-400' : scanStep === i + 1 ? 'text-white' : 'text-white/25'}`}>{ang}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hidden file input */}
              <input ref={uploadInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => uploadCurrentAngle(e.target.files?.[0] || null)} />

              {/* Upload fallback button (shown only when camera unavailable) */}
              {scanStep > 0 && scanStep <= 3 && !anglesDone[scanStep - 1] && useUploadFallback && (
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => uploadInputRef.current?.click()}
                    disabled={isCapturing}
                    className="w-full h-[52px] bg-[#137fec] text-white rounded-2xl font-semibold text-[15px] tracking-wide transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCapturing ? (
                      <><Loader2 size={18} className="animate-spin" /> Registering…</>
                    ) : (
                      <><ImagePlus size={18} /> Upload {['Front', 'Left', 'Right'][scanStep - 1]}</>
                    )}
                  </button>
                </div>
              )}
              {/* Auto-capture status (when camera is active) */}
              {scanStep > 0 && scanStep <= 3 && !anglesDone[scanStep - 1] && !useUploadFallback && (
                <div className="flex items-center justify-center h-[52px]">
                  <div className="flex items-center gap-2.5 text-white/50 text-[13px] font-medium">
                    {autoCapStatus === 'detected' ? (
                      <><Loader2 size={16} className="animate-spin text-amber-400" /> <span className="text-amber-400">Detecting face…</span></>
                    ) : autoCapStatus === 'captured' ? (
                      <><CheckCircle2 size={16} className="text-emerald-400" /> <span className="text-emerald-400">Registered!</span></>
                    ) : (
                      <><div className="w-2 h-2 rounded-full bg-[#137fec] animate-pulse" /> Auto-scanning — position your face in the guide</>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

        {step === 4 && (
          <div className="flex flex-col items-center justify-center text-center space-y-8 py-12 animate-in bounce-in">
            <div className="w-24 h-24 rounded-[2rem] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center shadow-lg">
              <CheckCircle2 size={48} strokeWidth={3} />
            </div>
            <div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Saved!</h3>
              <p className="text-slate-400 dark:text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-2">Added successfully</p>
            </div>
            <button onClick={() => { setStep(1); setScanStep(0); setScanError(null); setAnglesDone([false, false, false]); setScanProgress(0); }} className="px-12 py-5 bg-[#137fec] text-white rounded-lg font-bold text-sm tracking-wide shadow-[0_4px_14px_0_rgba(19,127,236,0.39)] active:scale-95 transition-all">Add Another</button>
          </div>
        )}
      </div>

      {/* ── Full-screen Avatar Camera Portal ── */}
      {avatarCameraOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col overflow-hidden">
          {/* Camera feed */}
          <div className="absolute inset-0">
            <video
              ref={avatarVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${avatarFacing === 'user' ? 'scale-x-[-1]' : ''}`}
            />
          </div>

          {/* Gradients */}
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none z-10" />
          <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-10" />

          {/* Header */}
          <header className="relative z-30 flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2">
            <div className="flex items-center gap-2.5">
              <button
                onClick={closeAvatarCamera}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md active:scale-90 transition-transform"
              >
                <ArrowLeft size={20} className="text-white" />
              </button>
              <span className="text-white text-[15px] font-semibold">Staff Photo</span>
            </div>
            <button
              onClick={() => setAvatarFacing(prev => prev === 'user' ? 'environment' : 'user')}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md active:scale-90 transition-transform"
              aria-label="Switch camera"
            >
              <SwitchCamera size={19} className="text-white" />
            </button>
          </header>

          {/* Center face guide */}
          <div className="flex-1 relative z-20 flex flex-col items-center justify-center pointer-events-none">
            <div className="relative">
              <svg width="260" height="340" viewBox="0 0 260 340" fill="none" className="drop-shadow-lg">
                <rect x="4" y="4" width="252" height="332" rx="126" ry="140" stroke="white" strokeWidth="2.5" fill="none" strokeDasharray="12 8" className="opacity-60" />
                <path d="M50 8 L8 8 Q4 8 4 12 L4 60" stroke="rgba(255,255,255,0.7)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                <path d="M210 8 L252 8 Q256 8 256 12 L256 60" stroke="rgba(255,255,255,0.7)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                <path d="M50 332 L8 332 Q4 332 4 328 L4 280" stroke="rgba(255,255,255,0.7)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                <path d="M210 332 L252 332 Q256 332 256 328 L256 280" stroke="rgba(255,255,255,0.7)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              </svg>
              {/* Countdown overlay */}
              {avatarCountdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-7xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]" style={{ animation: 'slideInFromBottom 0.3s ease-out' }}>{avatarCountdown}</span>
                </div>
              )}
              {/* Scanning sweep line */}
              {avatarCountdown === null && (
                <div className="absolute inset-x-8 top-1 bottom-1 overflow-hidden rounded-[126px]">
                  <div className="scan-line-sweep absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white/60 to-transparent blur-[1px]" />
                </div>
              )}
            </div>
            <div className="mt-6 px-5 py-2.5 rounded-full backdrop-blur-md bg-white/10 border border-white/20">
              <span className="text-white text-[13px] font-medium">
                {avatarCountdown !== null ? `Capturing in ${avatarCountdown}…` : 'Position your face in the guide'}
              </span>
            </div>
          </div>

          {/* Bottom controls */}
          <div className="relative z-30 px-5 pb-[max(20px,env(safe-area-inset-bottom))] flex flex-col items-center gap-4">
            {/* Shutter button */}
            <button
              onClick={handleAvatarCapture}
              disabled={avatarCountdown !== null}
              className="w-[72px] h-[72px] rounded-full border-[4px] border-white/80 bg-white/20 backdrop-blur-md flex items-center justify-center active:scale-90 transition-all disabled:opacity-50 shadow-[0_0_30px_rgba(255,255,255,0.15)]"
            >
              <div className="w-[56px] h-[56px] rounded-full bg-white" />
            </button>
            <p className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">Tap to capture</p>
          </div>
        </div>,
        document.body
      )}
      </div>
    </>
  );
};

export default SettingsPage;
