
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
  ArrowLeft,
  ArrowUpRight,
  History,
  TrendingUp,
  LayoutGrid
} from 'lucide-react';
import FaceScanner, { FaceMatch } from '../components/FaceScanner';
import { MOCK_CLASSES, BackButton, isTestClass } from '../constants';
import { Student } from '../types';
import { attendance as attendanceApi } from '../services/api';
import { haptics } from '../services/haptics';

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
  const [reviewMode, setReviewMode] = useState(false);
  const [manualPresence, setManualPresence] = useState<{ [id: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');

  const [sessionActive, setSessionActive] = useState(false);
  const [recognizedStudents, setRecognizedStudents] = useState<Map<string, { name: string; confidence: number; avatar: string }>>(new Map());
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeMsg, setFinalizeMsg] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [lastRecognizedEntry, setLastRecognizedEntry] = useState<{ name: string; avatar: string; time: string } | null>(null);
  const [finalizeResult, setFinalizeResult] = useState<{ present_count: number; total_students: number; present_names: { id: string; name: string; avatar: string }[] } | null>(null);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  useEffect(() => {
    if (preSelected) {
      const cls = groupList.find(c => c.id === preSelected.classId);
      if (cls) setSelectedClass(cls);
    }
  }, [preSelected, groupList]);

  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    if (isTestClass(selectedClass)) return studentList;
    return studentList.filter(s => s.classId === selectedClass.id);
  }, [selectedClass, studentList]);

  const filteredStudents = useMemo(() => {
    return classStudents.filter(s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNo.includes(searchTerm)
    );
  }, [classStudents, searchTerm]);

  const currentCount = reviewMode
    ? new Set([...Array.from(recognizedStudents.keys()), ...Object.entries(manualPresence).filter(([, v]) => v).map(([id]) => id)]).size
    : isManualMode
      ? Object.values(manualPresence).filter(v => v).length
      : recognizedStudents.size;

  const totalCapacity = classStudents.length || 42;

  const togglePresence = (id: string) => {
    haptics.impactLight();
    setManualPresence(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartScan = async () => {
    if (!selectedClass) return;
    setSessionError(null);
    haptics.impactMedium();
    try {
      await attendanceApi.startSession(selectedClass.id);
      setSessionActive(true);
      setIsScanning(true);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Failed to start attendance session.';
      if (detail.includes('already active')) {
        setSessionActive(true);
        setIsScanning(true);
      } else {
        setSessionError(detail);
      }
    }
  };

  const handleToggleScan = () => {
    haptics.impactMedium();
    if (isScanning) setIsScanning(false);
    else if (sessionActive) setIsScanning(true);
    else handleStartScan();
  };

  const handleDetect = useCallback((count: number, matches?: FaceMatch[]) => {
    setDetectedCount(count);
    if (matches && matches.length > 0) {
      setRecognizedStudents(prev => {
        const next = new Map(prev);
        for (const m of matches) {
          if (!next.has(m.student_id)) {
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

  const handleFinalize = async () => {
    haptics.impactHeavy();
    setIsFinalizing(true);
    try {
      try { await attendanceApi.stopScanning(); } catch { }
      const allPresentIds: string[] = [...new Set([
        ...Array.from(recognizedStudents.keys()),
        ...Object.entries(manualPresence).filter(([, v]) => v).map(([id]) => id)
      ])];
      if (allPresentIds.length > 0) await attendanceApi.verify(allPresentIds, []);
      const result = await attendanceApi.finalize();

      const presentNamesList: { id: string; name: string; avatar: string }[] = allPresentIds.map(sid => {
        const rec = recognizedStudents.get(sid);
        const stu = studentList.find(s => s.id === sid);
        return {
          id: sid,
          name: rec?.name || stu?.name || sid,
          avatar: rec?.avatar || stu?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(sid)}&background=137fec&color=fff&size=150&bold=true`
        };
      });

      setFinalizeResult({
        present_count: result.present_count || allPresentIds.length,
        total_students: result.total_students || classStudents.length,
        present_names: presentNamesList
      });
      setSessionActive(false);
      setIsScanning(false);
      haptics.notificationSuccess();
    } catch (err: any) {
      setSessionError(err?.response?.data?.detail || 'Failed to finalize session.');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleReset = () => {
    setSelectedClass(null);
    setRecognizedStudents(new Map());
    setFinalizeResult(null);
    setSessionError(null);
    setReviewMode(false);
    setManualPresence({});
    if (onExit) onExit();
  };

  if (!selectedClass) {
    return (
      <div className="space-y-10 page-enter pb-20">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-4xl font-display font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">Select Group</h2>
            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800/50 flex items-center gap-2">
              <Calendar size={16} className="text-indigo-600" />
              <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">{today}</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 font-medium max-w-xs">Initialize optical verification for your assigned academic division.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {groupList.map(cls => {
            const isTest = isTestClass(cls);
            return (
              <button
                key={cls.id}
                onClick={() => { haptics.impactMedium(); setSelectedClass(cls); }}
                className="glass-card group p-8 rounded-[3rem] text-left relative overflow-hidden tap-active"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full translate-x-10 -translate-y-10 transition-all duration-700 ${isTest ? 'bg-amber-500/20 group-hover:bg-amber-500/40' : 'bg-indigo-500/10 group-hover:bg-indigo-500/30'}`}></div>
                <div className="relative z-10 space-y-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 ${isTest ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600'}`}>
                    {isTest ? <Sparkles size={28} /> : <LayoutGrid size={28} />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">{cls.name}</h3>
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] mt-3 ${isTest ? 'text-amber-600' : 'text-slate-400'}`}>
                      {isTest ? 'Universal Access' : `Class Code: ${cls.code || 'SEC-A'}`}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (finalizeResult) {
    const { present_count, total_students, present_names } = finalizeResult;
    const absentStudents = classStudents.filter(s => !present_names.some(p => p.id === s.id));
    return (
      <div className="space-y-10 page-enter pb-20">
        <div className="flex items-center justify-between">
          <button onClick={handleReset} className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-sm tap-active"><ArrowLeft size={24} /></button>
          <div className="px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-2xl border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <CheckCircle2 size={16} /> Session Finalized
          </div>
        </div>

        <div className="glass-card p-10 rounded-[4rem] text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -translate-y-32"></div>
          <div className="relative z-10 space-y-6">
            <div className="w-24 h-24 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40 scale-110">
              <CheckCircle2 size={48} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-4xl font-display font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">{selectedClass.name}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">{today} &middot; Session Closed</p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
              <div className="p-6 rounded-[2rem] bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20">
                <p className="text-3xl font-display font-black text-slate-900 dark:text-white tabular-nums">{present_count}</p>
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-1">Confirmed</p>
              </div>
              <div className="p-6 rounded-[2rem] bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/20">
                <p className="text-3xl font-display font-black text-slate-900 dark:text-white tabular-nums">{total_students - present_count}</p>
                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-1">Absent</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Synched Identities</h4>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {present_names.map(s => (
              <div key={s.id} className="p-4 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex items-center gap-4 animate-in">
                <img src={s.avatar} alt="" className="w-12 h-12 rounded-xl object-cover border border-emerald-500/20" />
                <div className="flex-1">
                  <p className="text-[13px] font-black text-slate-900 dark:text-white uppercase leading-none">{s.name}</p>
                  <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-2 flex items-center gap-1"><Check size={10} /> Verified Biometric</p>
                </div>
              </div>
            ))}
            {absentStudents.map(s => (
              <div key={s.id} className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/40 flex items-center gap-4 opacity-70 animate-in">
                <img src={s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=f43f5e&color=fff&size=150&bold=true`} alt="" className="w-12 h-12 rounded-xl object-cover grayscale" />
                <div className="flex-1">
                  <p className="text-[13px] font-black text-slate-400 dark:text-slate-500 uppercase leading-none">{s.name}</p>
                  <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest mt-2 flex items-center gap-1"><XCircle size={10} /> Unidentified</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleReset} className="w-full py-6 bg-indigo-600 text-white font-display font-black rounded-[2rem] text-[12px] uppercase tracking-[0.3em] shadow-2xl shadow-indigo-600/30 tap-active hover:bg-slate-950 dark:hover:bg-indigo-500 transition-all">New Academic Session</button>
      </div>
    );
  }

  if (!isManualMode) {
    return (
      <FaceScanner
        onDetect={(count, matches) => {
          handleDetect(count, matches);
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
          haptics.impactMedium();
          handlePauseScan();
          setReviewMode(true);
          setIsManualMode(true);
          const preFilled: { [id: string]: boolean } = {};
          recognizedStudents.forEach((_, id) => { preFilled[id] = true; });
          setManualPresence(prev => ({ ...preFilled, ...prev }));
        }}
        title={selectedClass?.name || 'Group Attendance'}
        lastRecognized={lastRecognizedEntry}
        recognizedList={recognizedStudents}
        count={currentCount}
        total={totalCapacity}
        studentLookup={(id: string) => {
          const s = studentList.find(st => st.id === id);
          return s ? { name: s.name, avatar: s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=137fec&color=fff&size=150&bold=true` } : null;
        }}
        alreadyRecognizedIds={new Set(recognizedStudents.keys())}
        bottomContent={
          <div className="flex gap-4 w-full">
            <button onClick={handleToggleScan} className={`flex-1 h-16 flex items-center justify-center gap-3 rounded-[1.8rem] font-display font-black text-[12px] uppercase tracking-[0.3em] transition-all tap-active ${isScanning ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'}`}>
              {isScanning ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              {isScanning ? 'Hold' : 'Start'}
            </button>
            <button onClick={handleFinalize} disabled={isFinalizing || (!sessionActive && recognizedStudents.size === 0)} className="flex-1 h-16 flex items-center justify-center gap-3 rounded-[1.8rem] bg-emerald-500 text-white font-display font-black text-[12px] uppercase tracking-[0.3em] disabled:opacity-40 shadow-lg shadow-emerald-500/20 tap-active">
              {isFinalizing ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
              Finalize
            </button>
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-10 page-enter pb-20">
      <div className="flex items-center justify-between">
        <button onClick={() => { if (reviewMode) { setReviewMode(false); setIsManualMode(false); if (sessionActive) setIsScanning(true); else handleStartScan(); } else setSelectedClass(null); }} className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-sm tap-active"><ArrowLeft size={24} /></button>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{reviewMode ? 'Final Verification' : 'Manual Entry'}</p>
          <h4 className="text-4xl font-display font-black text-indigo-600 dark:text-indigo-400 tracking-tight">{currentCount}<span className="text-slate-200 dark:text-slate-800 text-2xl mx-1">/</span><span className="text-slate-400 text-2xl">{totalCapacity}</span></h4>
        </div>
      </div>

      <div className="space-y-8">
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
          <input type="text" placeholder="Search Roster Node..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full h-16 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.8rem] pl-16 pr-6 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-indigo-600 transition-all shadow-sm" />
        </div>

        <div className="glass-card rounded-[3.5rem] p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl translate-x-10 -translate-y-10"></div>
          <div className="max-h-[450px] overflow-y-auto no-scrollbar space-y-2 p-2">
            {filteredStudents.map(student => {
              const isCaptured = recognizedStudents.has(student.id);
              const isMarked = manualPresence[student.id];
              const active = isCaptured || isMarked;
              return (
                <div key={student.id} onClick={() => togglePresence(student.id)} className={`p-4 rounded-[1.8rem] border flex items-center gap-5 transition-all tap-active cursor-pointer ${active ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-800' : 'bg-transparent border-transparent grayscale opacity-60'}`}>
                  <img src={student.avatar} className="w-14 h-14 rounded-2xl object-cover border-2 border-white dark:border-slate-800" alt="" />
                  <div className="flex-1">
                    <h4 className="text-[14px] font-black text-slate-900 dark:text-white uppercase leading-none">{student.name}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">PIN: {student.rollNo} {isCaptured && <span className="text-emerald-500 ml-2">&bull; AI Linked</span>}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${active ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 dark:border-slate-800 text-transparent'}`}>
                    <Check size={20} strokeWidth={4} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button onClick={handleFinalize} disabled={isFinalizing || (!sessionActive && currentCount === 0)} className="w-full py-6 bg-emerald-600 text-white font-display font-black rounded-[2rem] text-[12px] uppercase tracking-[0.3em] shadow-2xl shadow-emerald-600/30 tap-active hover:bg-slate-950 dark:hover:bg-emerald-500 transition-all">
          {isFinalizing ? <Loader2 size={24} className="animate-spin" /> : <><CheckCircle2 size={20} className="inline mr-2" /> Commit Session</>}
        </button>
      </div>
    </div>
  );
};

export default ClassAttendance;
