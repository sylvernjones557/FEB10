
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  ChevronRight,
  Calendar,
  Layers,
  Sparkles,
  User,
  Users,
  Search,
  Camera,
  Check,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import FaceScanner, { FaceMatch } from '../components/FaceScanner';
import { MOCK_CLASSES, BackButton, isTestClass } from '../constants';
import { Student } from '../types';
import { attendance as attendanceApi } from '../services/api';

interface ClassAttendanceProps {
  isManualDay: boolean;
  preSelected?: { classId: string } | null;
  studentList: Student[];
  groupList?: any[];
  onExit?: () => void;
}

const ClassAttendance: React.FC<ClassAttendanceProps> = ({ isManualDay, preSelected, studentList, groupList = MOCK_CLASSES, onExit }) => {
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedCount, setDetectedCount] = useState(0);
  const [isManualMode, setIsManualMode] = useState(isManualDay);
  const [reviewMode, setReviewMode] = useState(false); // New: post-camera review step
  const [manualPresence, setManualPresence] = useState<{ [id: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Real attendance session state
  const [sessionActive, setSessionActive] = useState(false);
  const [recognizedStudents, setRecognizedStudents] = useState<Map<string, { name: string; confidence: number; avatar: string }>>(new Map());
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeMsg, setFinalizeMsg] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [lastRecognizedEntry, setLastRecognizedEntry] = useState<{ name: string; avatar: string; time: string } | null>(null);
  // Post-finalize summary
  const [finalizeResult, setFinalizeResult] = useState<{ present_count: number; total_students: number; present_names: { id: string; name: string; avatar: string }[] } | null>(null);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // Handle pre-selected navigation context
  useEffect(() => {
    if (preSelected) {
      const cls = groupList.find(c => c.id === preSelected.classId);
      if (cls) {
        setSelectedClass(cls);
      }
    }
  }, [preSelected, isManualMode]);

  // Filter students for the selected class
  // Test Class special: show ALL registered students across all classes
  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    if (isTestClass(selectedClass)) return studentList;
    return studentList.filter(s => s.classId === selectedClass.id);
  }, [selectedClass, studentList]);

  // Filter for search in manual mode
  const filteredStudents = useMemo(() => {
    return classStudents.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.rollNo.includes(searchTerm)
    );
  }, [classStudents, searchTerm]);

  // Current count based on mode — in review mode, count both AI-recognized + manual marks (deduplicated)
  const currentCount = reviewMode
    ? new Set([...Array.from(recognizedStudents.keys()), ...Object.entries(manualPresence).filter(([, v]) => v).map(([id]) => id)]).size
    : isManualMode 
      ? Object.values(manualPresence).filter(v => v).length 
      : recognizedStudents.size;

  const totalCapacity = classStudents.length || 42;

  const togglePresence = (id: string) => {
    setManualPresence(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const markAllPresent = () => {
    const next: { [id: string]: boolean } = {};
    classStudents.forEach(s => next[s.id] = true);
    setManualPresence(next);
  };

  /** Start the attendance session on the backend + begin scanning */
  const handleStartScan = async () => {
    if (!selectedClass) return;
    setSessionError(null);

    try {
      await attendanceApi.startSession(selectedClass.id);
      setSessionActive(true);
      setIsScanning(true);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Failed to start attendance session.';
      // If a session is already active, just start scanning
      if (detail.includes('already active')) {
        setSessionActive(true);
        setIsScanning(true);
      } else {
        setSessionError(detail);
      }
    }
  };

  /** Pause scanning */
  const handlePauseScan = () => {
    setIsScanning(false);
  };

  /** Toggle scan on/off */
  const handleToggleScan = () => {
    if (isScanning) {
      handlePauseScan();
    } else if (sessionActive) {
      setIsScanning(true);
    } else {
      handleStartScan();
    }
  };

  /** Handle detection from FaceScanner — accumulate recognized students */
  const handleDetect = useCallback((count: number, matches?: FaceMatch[]) => {
    setDetectedCount(count);
    if (matches && matches.length > 0) {
      setRecognizedStudents(prev => {
        const next = new Map(prev);
        for (const m of matches) {
          if (!next.has(m.student_id)) {
            // Look up student info from local list
            const student = studentList.find(s => s.id === m.student_id);
            next.set(m.student_id, {
              name: student?.name || m.student_id,
              confidence: m.confidence,
              avatar: student?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.student_id)}&background=818CF8&color=fff&size=150&bold=true`,
            });
          }
        }
        return next;
      });
    }
  }, [studentList]);

  /** Finalize the session — stop scanning, verify, then finalize on backend */
  const handleFinalize = async () => {
    setIsFinalizing(true);
    setFinalizeMsg(null);
    setSessionError(null);

    try {
      // Stop scanning on backend
      try { await attendanceApi.stopScanning(); } catch { /* might already be stopped */ }

      // Send ALL recognized student IDs (from face scan + manual) to backend verify
      const aiPresentIds: string[] = Array.from(recognizedStudents.keys());
      const manualPresentIds: string[] = Object.entries(manualPresence).filter(([, v]) => v).map(([id]) => id);
      const allPresentIds: string[] = [...new Set([...aiPresentIds, ...manualPresentIds])];
      if (allPresentIds.length > 0) {
        await attendanceApi.verify(allPresentIds, []);
      }

      // Finalize
      const result = await attendanceApi.finalize();
      const presentCount = result.present_count || 0;
      const totalStudents = result.total_students || 0;

      // Build present names list from recognizedStudents + manual
      const presentNames: { id: string; name: string; avatar: string }[] = [];
      for (const sid of allPresentIds) {
        const fromRecognized = recognizedStudents.get(sid);
        if (fromRecognized) {
          presentNames.push({ id: sid, name: fromRecognized.name, avatar: fromRecognized.avatar });
        } else {
          const student = studentList.find(s => s.id === sid);
          presentNames.push({
            id: sid,
            name: student?.name || sid,
            avatar: student?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(sid)}&background=137fec&color=fff&size=150&bold=true`,
          });
        }
      }

      setFinalizeResult({ present_count: presentCount, total_students: totalStudents, present_names: presentNames });
      setFinalizeMsg(`Session finalized! ${presentCount} students marked present.`);
      setSessionActive(false);
      setIsScanning(false);
    } catch (err: any) {
      setSessionError(err?.response?.data?.detail || 'Failed to finalize session.');
    } finally {
      setIsFinalizing(false);
    }
  };

  /** Reset scanner */
  const handleReset = () => {
    setDetectedCount(0);
    setRecognizedStudents(new Map());
    setFinalizeMsg(null);
    setFinalizeResult(null);
    setSessionError(null);
    setLastRecognizedEntry(null);
    setReviewMode(false);
    setManualPresence({});
  };

  if (!selectedClass) {
    return (
      <div className="space-y-8 page-enter">
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Attendance System</p>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Choose Group</h2>
          <div className="flex items-center gap-2 mt-2">
            <Calendar size={14} className="text-slate-400" strokeWidth={3} />
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{today}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {groupList.map(cls => {
            const testCls = isTestClass(cls);
            return (
              <button 
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                className={`p-7 rounded-[2.5rem] border shadow-sm flex items-center justify-between group tap-active transition-all duration-300 ${
                  testCls
                    ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40'
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 shadow-sm ${
                    testCls
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white'
                      : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:bg-indigo-500'
                  }`}>
                    {testCls ? <Sparkles size={24} /> : <Layers size={24} />}
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">{cls.name}</h3>
                    <p className={`text-[10px] font-bold uppercase mt-2.5 ${
                      testCls ? 'text-amber-500 dark:text-amber-400' : 'text-indigo-500 dark:text-indigo-400'
                    }`}>
                      {testCls ? 'All Students • No Schedule Limits' : `Code ${cls.code || cls.id}`}
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} strokeWidth={3} className="text-slate-200 dark:text-slate-800 group-hover:text-indigo-600 transition-all group-hover:translate-x-1" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Post-finalize summary screen
  if (finalizeResult) {
    const { present_count, total_students, present_names } = finalizeResult;
    const absentStudents = classStudents.filter(s => !present_names.some(p => p.id === s.id));
    return (
      <div className="space-y-6 page-enter pb-10">
        <BackButton onClick={() => { handleReset(); setSelectedClass(null); if (onExit) onExit(); }} />

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Session Complete</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{selectedClass?.name} &middot; {today}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 text-center">
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{present_count}</p>
            <p className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-widest mt-1">Present</p>
          </div>
          <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/30 text-center">
            <p className="text-3xl font-black text-rose-600 dark:text-rose-400">{total_students - present_count}</p>
            <p className="text-[10px] font-bold text-rose-500/70 uppercase tracking-widest mt-1">Absent</p>
          </div>
        </div>

        {/* Present students list */}
        {present_names.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 size={12} /> Present ({present_names.length})
            </h3>
            <div className="space-y-2">
              {present_names.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/20">
                  <img src={s.avatar} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-emerald-300 dark:border-emerald-700" />
                  <span className="font-semibold text-sm text-slate-800 dark:text-white flex-1">{s.name}</span>
                  <CheckCircle2 size={16} className="text-emerald-500" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Absent students list */}
        {absentStudents.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest flex items-center gap-2">
              <XCircle size={12} /> Absent ({absentStudents.length})
            </h3>
            <div className="space-y-2">
              {absentStudents.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/20">
                  <img src={s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=f43f5e&color=fff&size=150&bold=true`} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-rose-300 dark:border-rose-700 opacity-60" />
                  <span className="font-semibold text-sm text-slate-500 dark:text-slate-400 flex-1">{s.name}</span>
                  <XCircle size={16} className="text-rose-400" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => { handleReset(); }}
            className="flex-1 h-12 rounded-xl bg-[#137fec] text-white font-bold text-[13px] flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-indigo-600/20"
          >
            <RotateCcw size={16} /> New Session
          </button>
          <button
            onClick={() => { handleReset(); setSelectedClass(null); if (onExit) onExit(); }}
            className="flex-1 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[13px] flex items-center justify-center gap-2 active:scale-95 transition-transform border border-slate-200 dark:border-slate-700"
          >
            <ArrowLeft size={16} /> Exit
          </button>
        </div>
      </div>
    );
  }

  // Full-screen AI Scanner mode
  if (!isManualMode) {
    return (
      <FaceScanner
        onDetect={(count, matches) => {
          handleDetect(count, matches);
          // Update last recognized for bottom-sheet
          if (matches && matches.length > 0) {
            const m = matches[matches.length - 1];
            const student = studentList.find(s => s.id === m.student_id);
            setLastRecognizedEntry({
              name: student?.name || m.student_id,
              avatar: student?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.student_id)}&background=137fec&color=fff&size=150&bold=true`,
              time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            });
          }
        }}
        isScanning={isScanning}
        onBack={() => {
          handlePauseScan();
          // Enter review mode: show captured students + manual backup
          setReviewMode(true);
          setIsManualMode(true);
          // Pre-populate manual toggles: mark all AI-recognized students as present
          const preFilled: { [id: string]: boolean } = {};
          recognizedStudents.forEach((_, id) => { preFilled[id] = true; });
          setManualPresence(prev => ({ ...preFilled, ...prev }));
        }}
        title={selectedClass?.name || 'Group Attendance'}
        lastRecognized={lastRecognizedEntry}
        recognizedList={recognizedStudents}
        count={currentCount}
        total={totalCapacity}
        onDone={undefined}
        studentLookup={(id: string) => {
          const s = studentList.find(st => st.id === id);
          return s ? { name: s.name, avatar: s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=137fec&color=fff&size=150&bold=true` } : null;
        }}
        alreadyRecognizedIds={new Set(recognizedStudents.keys())}
        bottomContent={
          <div className="flex gap-2 w-full">
            {sessionError && (
              <div className="absolute -top-14 left-0 right-0 mx-5 bg-rose-500/15 backdrop-blur-xl rounded-xl border border-rose-500/20 p-2.5 flex items-center gap-2 text-rose-300 text-xs font-bold">
                <AlertCircle size={14} /> {sessionError}
              </div>
            )}
            {finalizeMsg && (
              <div className="absolute -top-14 left-0 right-0 mx-5 bg-emerald-500/15 backdrop-blur-xl rounded-xl border border-emerald-500/20 p-2.5 flex items-center gap-2 text-emerald-300 text-xs font-bold">
                <CheckCircle2 size={14} /> {finalizeMsg}
              </div>
            )}
            <button
              onClick={handleToggleScan}
              className={`flex-1 h-12 flex items-center justify-center gap-2 rounded-xl font-bold text-[13px] tracking-wide transition-all active:scale-95 ${
                isScanning
                  ? 'bg-amber-500 text-white shadow-[0_4px_14px_0_rgba(245,158,11,0.35)]'
                  : 'bg-[#137fec] text-white shadow-[0_4px_14px_0_rgba(19,127,236,0.39)]'
              }`}
            >
              {isScanning ? <><Pause size={16} fill="currentColor" strokeWidth={0} /> Pause</> : <><Play size={16} fill="currentColor" strokeWidth={0} /> {sessionActive ? 'Resume' : 'Start'}</>}
            </button>
            <button
              onClick={handleFinalize}
              disabled={isFinalizing || (!sessionActive && recognizedStudents.size === 0 && Object.values(manualPresence).filter(v => v).length === 0)}
              className="flex-1 h-12 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-white font-bold text-[13px] tracking-wide disabled:opacity-40 transition-all active:scale-95 shadow-[0_4px_14px_0_rgba(16,185,129,0.35)]"
            >
              {isFinalizing ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><CheckCircle2 size={16} /> Finalize</>}
            </button>
          </div>
        }
      />
    );
  }

  // Manual attendance / Review mode
  return (
    <div className="space-y-6 page-enter pb-10">
      <div className="flex items-center justify-between">
        <BackButton onClick={() => {
          if (reviewMode) {
            // Go back to camera from review
            setReviewMode(false);
            setIsManualMode(false);
            if (sessionActive) setIsScanning(true); else handleStartScan();
          } else {
            preSelected && onExit ? onExit() : setSelectedClass(null);
          }
        }} />
        <div className="text-right">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest">
            {reviewMode ? 'Review & Confirm' : isManualMode ? 'Manual Selection' : isScanning ? 'Scanning Active' : 'Scanner Paused'}
          </p>
          <h4 className="text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter flex items-center justify-end gap-2">
            {currentCount}
            <span className="text-slate-200 dark:text-slate-800 text-2xl font-normal">/</span>
            <span className="text-slate-400 dark:text-slate-600 text-2xl">{totalCapacity}</span>
          </h4>
        </div>
      </div>

      {/* Session / Error messages */}
      {sessionError && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold">
          <AlertCircle size={18} /> {sessionError}
        </div>
      )}
      {finalizeMsg && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold">
          <CheckCircle2 size={18} /> {finalizeMsg}
        </div>
      )}

      <div className="space-y-8">
        {/* ── Review Mode: post-camera verification ── */}
        {reviewMode ? (
          <>
            {/* Info banner */}
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/30">
              <Camera size={20} className="text-indigo-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Camera scan complete</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {recognizedStudents.size > 0
                    ? `${recognizedStudents.size} student${recognizedStudents.size > 1 ? 's' : ''} detected by AI. Review below and add anyone missed manually.`
                    : 'No students were detected. You can manually mark attendance below.'}
                </p>
              </div>
            </div>

            {/* AI-Captured Students (auto-present) */}
            {recognizedStudents.size > 0 && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2 px-1">
                  <CheckCircle2 size={12} /> Captured by Camera ({recognizedStudents.size})
                </h3>
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="max-h-[240px] overflow-y-auto no-scrollbar divide-y divide-slate-100 dark:divide-slate-800">
                    {Array.from(recognizedStudents.entries()).map(([id, info]) => {
                      const student = studentList.find(s => s.id === id);
                      return (
                        <div key={id} className="flex items-center gap-3 p-4">
                          <img src={info.avatar} alt="" className="w-10 h-10 rounded-xl object-cover border-2 border-emerald-300 dark:border-emerald-700" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{info.name}</h4>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
                              {student?.rollNo ? `ID: ${student.rollNo}` : ''} &middot; {info.confidence.toFixed(0)}% match
                            </p>
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 size={16} strokeWidth={3} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Manual Backup: students NOT captured by camera */}
            {(() => {
              const uncapturedStudents = classStudents.filter(s => !recognizedStudents.has(s.id));
              if (uncapturedStudents.length === 0) return null;
              return (
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-2">
                      <AlertCircle size={12} /> Not Detected ({uncapturedStudents.length})
                    </h3>
                    <button
                      onClick={() => {
                        const next = { ...manualPresence };
                        uncapturedStudents.forEach(s => { next[s.id] = true; });
                        setManualPresence(next);
                      }}
                      className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800/40"
                    >
                      Mark All Present
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                      type="text"
                      placeholder="Search missed students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl py-3.5 pl-12 pr-5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 shadow-inner"
                    />
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="max-h-[300px] overflow-y-auto no-scrollbar divide-y divide-slate-100 dark:divide-slate-800">
                      {uncapturedStudents
                        .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.rollNo.includes(searchTerm))
                        .map(student => {
                        const isMarked = manualPresence[student.id] || false;
                        return (
                          <div
                            key={student.id}
                            onClick={() => togglePresence(student.id)}
                            className={`flex items-center gap-3 p-4 cursor-pointer transition-all active:scale-[0.99] ${
                              isMarked ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-950'
                            }`}
                          >
                            <img
                              src={student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=818CF8&color=fff&size=150&bold=true`}
                              alt=""
                              className={`w-10 h-10 rounded-xl object-cover border-2 ${isMarked ? 'border-indigo-300 dark:border-indigo-700' : 'border-slate-200 dark:border-slate-700 opacity-60'}`}
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-sm font-bold truncate ${isMarked ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{student.name}</h4>
                              <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">ID: {student.rollNo}</p>
                            </div>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              isMarked
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-700'
                            }`}>
                              {isMarked ? <Check size={16} strokeWidth={3} /> : <div className="w-3 h-3 rounded-full border-2 border-slate-200 dark:border-slate-700" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Action buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleFinalize}
                disabled={isFinalizing}
                className="w-full py-5 bg-emerald-600 dark:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-2xl text-[11px] uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                {isFinalizing ? (
                  <><Loader2 size={20} className="animate-spin" /> Confirming Attendance…</>
                ) : (
                  <><CheckCircle2 size={20} /> Confirm & Submit Attendance</>
                )}
              </button>
              <button
                onClick={() => {
                  setReviewMode(false);
                  setIsManualMode(false);
                  if (sessionActive) setIsScanning(true); else handleStartScan();
                }}
                className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl text-[11px] uppercase tracking-widest border border-slate-200 dark:border-slate-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <Camera size={18} /> Back to Camera
              </button>
            </div>
          </>
        ) : (
          /* ── Original Manual Mode (non-review) ── */
          <>
            {/* Toggle Mode Switcher */}
            <div className="flex p-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.8rem]">
              <button
                onClick={() => { setIsManualMode(false); if (!sessionActive) handleStartScan(); else setIsScanning(true); }}
                className={`flex-1 py-4 flex items-center justify-center gap-3 rounded-[1.4rem] text-[11px] font-black uppercase tracking-widest transition-all ${!isManualMode ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-500'}`}
              >
                <Camera size={18} /> AI Scan
              </button>
              <button
                onClick={() => { setIsManualMode(true); setIsScanning(false); }}
                className={`flex-1 py-4 flex items-center justify-center gap-3 rounded-[1.4rem] text-[11px] font-black uppercase tracking-widest transition-all ${isManualMode ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-500'}`}
              >
                <User size={18} /> Manual
              </button>
            </div>

            {/* Dynamic Display Area */}
            {!isManualMode ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                <Camera size={48} className="text-[#137fec] opacity-50" />
                <p className="text-sm font-bold text-slate-400">Switching to full-screen scanner…</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
                <div className="relative group">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 group-focus-within:text-indigo-500 transition-colors" size={20} />
                  <input
                    type="text"
                    placeholder="Search Student ID or Name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 shadow-inner"
                  />
                </div>

                <div className="flex justify-between items-center px-2">
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Users size={14} className="text-indigo-500" /> Member Roster
                  </h3>
                  <button
                    onClick={markAllPresent}
                    className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800/40"
                  >
                    Mark All Present
                  </button>
                </div>

                <div className="max-h-[400px] overflow-y-auto no-scrollbar space-y-3">
                  {filteredStudents.length > 0 ? filteredStudents.map(student => (
                    <div
                      key={student.id}
                      onClick={() => togglePresence(student.id)}
                      className={`p-4 rounded-[1.5rem] border flex items-center gap-4 transition-all tap-active cursor-pointer ${
                        manualPresence[student.id]
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950'
                      }`}
                    >
                      <img src={student.avatar} className="w-12 h-12 rounded-xl object-cover border-2 border-white dark:border-slate-800 shadow-sm" alt="" />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{student.name}</h4>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">ID: {student.rollNo}</p>
                      </div>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        manualPresence[student.id]
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'bg-slate-100 dark:bg-slate-950 text-slate-300 dark:text-slate-800'
                      }`}>
                        {manualPresence[student.id] ? <Check size={20} strokeWidth={3} /> : <div className="w-4 h-4 rounded-full border-2 border-slate-200 dark:border-slate-800"></div>}
                      </div>
                    </div>
                  )) : (
                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 text-slate-400">
                      <AlertCircle size={40} className="opacity-20" />
                      <p className="text-sm font-bold">No students found.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sync Controls */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.8rem] border border-slate-100 dark:border-slate-800 p-8 space-y-6 shadow-sm transition-colors duration-500">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={14} className="text-indigo-500" /> {recognizedStudents.size > 0 ? `${recognizedStudents.size} Recognized` : 'Recent Sync Feed'}
                </h3>
                <span className={`w-2 h-2 rounded-full ${sessionActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                {recognizedStudents.size > 0 ? (
                  Array.from(recognizedStudents.entries()).map(([id, info]) => (
                    <div key={id} className="flex-shrink-0 w-16 h-16 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 p-1 relative group tap-active transition-all hover:scale-105" title={`${info.name} (${info.confidence.toFixed(0)}%)`}>
                      <img src={info.avatar} className="w-full h-full rounded-xl object-cover" alt={info.name} />
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-lg">
                        <CheckCircle2 size={12} className="text-white" strokeWidth={4} />
                      </div>
                    </div>
                  ))
                ) : (
                  [1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="flex-shrink-0 w-16 h-16 rounded-2xl border-2 border-slate-100 dark:border-slate-800 p-1 relative group tap-active transition-all opacity-30">
                      <div className="w-full h-full rounded-xl bg-slate-200 dark:bg-slate-800"></div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={handleFinalize}
                disabled={isFinalizing || (!sessionActive && recognizedStudents.size === 0 && Object.values(manualPresence).filter(v => v).length === 0)}
                className="w-full py-5 bg-emerald-600 dark:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-2xl text-[11px] uppercase tracking-widest shadow-xl tap-active transition-all active:scale-[0.98] flex items-center justify-center gap-3"
              >
                {isFinalizing ? (
                  <><Loader2 size={20} className="animate-spin" /> Finalizing…</>
                ) : (
                  <><CheckCircle2 size={20} /> Finalize and Sync</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClassAttendance;
