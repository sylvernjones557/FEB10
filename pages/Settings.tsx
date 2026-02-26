
import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  RotateCw
} from 'lucide-react';
import { BackButton, MOCK_CLASSES } from '../constants';
import { StaffMember, Student, StaffType, DaySchedule } from '../types';
import { recognition } from '../services/api';

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
  const streamRef = useRef<MediaStream | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [anglesDone, setAnglesDone] = useState<boolean[]>([false, false, false]);

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

  useEffect(() => {
    if (step === 2 && activeTab === 'STUDENT') {
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      })
        .then(stream => {
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(err => { console.error(err); setScanError('Camera access denied.'); });
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [step, activeTab]);

  const updateTimetable = (dayIndex: number, periodIndex: number, field: string, value: string) => {
    const newTimetable = [...timetable];
    newTimetable[dayIndex].periods[periodIndex] = { ...newTimetable[dayIndex].periods[periodIndex], [field]: value };
    setTimetable(newTimetable);
  };

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

  const startScanSequence = () => {
    setScanStep(1);
    setScanProgress(0);
    setScanError(null);
    setAnglesDone([false, false, false]);
  };

  /** Capture current angle and register via API */
  const captureCurrentAngle = async () => {
    const idx = scanStep - 1;
    if (idx < 0 || idx > 2) return;
    setIsCapturing(true);
    setScanError(null);

    try {
      const blob = await captureFrame();
      if (!blob) throw new Error('Failed to capture frame');

      // Use roll/id as student_id
      const studentId = studentForm.roll;
      await recognition.registerFace(studentId, blob);

      // Mark this angle as done
      const newDone = [...anglesDone];
      newDone[idx] = true;
      setAnglesDone(newDone);
      setScanProgress(Math.round(((idx + 1) / 3) * 100));

      if (scanStep < 3) {
        setScanStep(scanStep + 1);
      } else {
        // All 3 angles done — finalize
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
        finalizeStudent();
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Face registration failed. Ensure your face is clearly visible.';
      setScanError(detail);
    } finally {
      setIsCapturing(false);
    }
  };

  const finalizeStudent = () => {
    // Student was already created via onAddStudent in step 1 → step 2 transition
    // Face data is now registered via API calls above
    setStep(4);
  };

  const finalizeStaff = async () => {
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

    setStep(4);
  };

  return (
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

            {/* AVATAR UPLOAD */}
            {activeTab === 'STAFF' && (
              <div className="flex flex-col items-center gap-3">
                <div
                  onClick={() => avatarInputRef.current?.click()}
                  className="relative w-28 h-28 rounded-[2rem] border-[3px] border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50 dark:bg-slate-950 flex items-center justify-center cursor-pointer group transition-all duration-300 overflow-hidden shadow-inner"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors">
                      <ImagePlus size={28} strokeWidth={1.5} />
                      <span className="text-[9px] font-bold uppercase tracking-widest">Upload</span>
                    </div>
                  )}
                  {avatarPreview && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Camera size={24} className="text-white" />
                    </div>
                  )}
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

              <button onClick={async () => {
                if (activeTab === 'STUDENT') {
                  // Create student in DB first, then go to face scan
                  setScanError(null);
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
                  setStep(2);
                }
              }} className="w-full py-5 rounded-2xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 mt-4 flex items-center justify-center gap-3">
                Next <ChevronRight size={18} strokeWidth={3} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && activeTab === 'STAFF' && (
          <div className="space-y-6 animate-in slide-in-from-right-6">
            <div className="text-center">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Teacher Schedule</h3>
              <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-2">Set class times</p>
            </div>

            <div className="max-h-[480px] overflow-y-auto pr-2 space-y-6 no-scrollbar pb-4">
              {timetable.map((day, dIdx) => (
                <div key={day.day} className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <Calendar size={18} />
                    <h4 className="text-sm font-black uppercase tracking-widest">{day.day}</h4>
                  </div>

                  <div className="space-y-4">
                    {day.periods.map((p, pIdx) => (
                      <div key={p.period} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="flex bg-slate-50 dark:bg-slate-800/50 px-4 py-2 border-b border-slate-100 dark:border-slate-800 items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Clock size={12} /> Period {p.period}
                          </span>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="relative">
                            <BookOpen size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700" />
                            <input
                              placeholder="Enter Subject Name"
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-xs font-bold text-slate-900 dark:text-white focus:border-indigo-600 outline-none transition-all"
                              value={p.subject}
                              onChange={e => updateTimetable(dIdx, pIdx, 'subject', e.target.value)}
                            />
                          </div>
                          <div className="relative">
                            <Layers size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700" />
                            <select
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 outline-none appearance-none transition-all"
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

            <div className="sticky bottom-0 bg-white dark:bg-slate-900 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button onClick={finalizeStaff} className="w-full py-5 rounded-2xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Save Schedule</button>
            </div>
          </div>
        )}

        {step === 2 && activeTab === 'STUDENT' && (
          <div className="space-y-8 animate-in zoom-in-95">
            <div className="relative w-full aspect-square bg-slate-100 dark:bg-slate-950 rounded-[2.5rem] overflow-hidden border-2 border-slate-200 dark:border-slate-800 shadow-inner">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              {scanStep > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-[6px] border-indigo-600/20 rounded-full flex items-center justify-center relative bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm shadow-2xl">
                    <div className="absolute inset-0 border-[6px] border-t-indigo-600 rounded-full animate-spin"></div>
                    <span className="text-slate-900 dark:text-white font-black text-4xl">{scanProgress}%</span>
                  </div>
                  <div className="mt-8 bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl">
                    {scanStep === 1 ? 'CENTER FACE' : scanStep === 2 ? 'TURN LEFT' : 'TURN RIGHT'}
                  </div>
                </div>
              )}
              {scanStep === 0 && (
                <div className="absolute inset-0 flex items-center justify-center p-8 text-center transition-all duration-500">
                  <button onClick={startScanSequence} className="px-10 py-6 bg-indigo-600 text-white rounded-[2rem] font-bold text-sm tracking-widest shadow-2xl flex items-center gap-4 hover:scale-105 active:scale-95 transition-all">
                    <Camera size={24} /> START FACE SCAN
                  </button>
                </div>
              )}
            </div>

            {/* Error message */}
            {scanError && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold">
                <AlertCircle size={18} /> {scanError}
              </div>
            )}

            {/* Angle indicators */}
            <div className="flex justify-around items-center px-4">
              {['FRONT', 'LEFT', 'RIGHT'].map((ang, i) => (
                <div key={ang} className={`flex flex-col items-center gap-3 transition-all duration-500 ${anglesDone[i] ? 'text-emerald-500' : scanStep === i + 1 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-800'}`}>
                  {anglesDone[i] ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <div className={`w-4 h-4 rounded-full transition-all duration-500 ${scanStep === i + 1 ? 'bg-indigo-600 shadow-[0_0_12px_rgba(79,70,229,0.8)]' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                  )}
                  <span className="text-[9px] font-bold uppercase tracking-widest">{ang}</span>
                </div>
              ))}
            </div>

            {/* Capture button */}
            {scanStep > 0 && scanStep <= 3 && !anglesDone[scanStep - 1] && (
              <button
                onClick={captureCurrentAngle}
                disabled={isCapturing}
                className="w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {isCapturing ? (
                  <><Loader2 size={20} className="animate-spin" /> Registering Face…</>
                ) : scanError ? (
                  <><RotateCw size={20} /> Retry Capture</>
                ) : (
                  <><Camera size={20} /> Capture {['Front', 'Left', 'Right'][scanStep - 1]} Angle</>
                )}
              </button>
            )}
          </div>
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
            <button onClick={() => { setStep(1); setScanStep(0); setScanError(null); setAnglesDone([false, false, false]); setScanProgress(0); }} className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Add Another</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
