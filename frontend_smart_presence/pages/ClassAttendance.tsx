
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
  Loader2
} from 'lucide-react';
import FaceScanner, { FaceMatch } from '../components/FaceScanner';
import { MOCK_CLASSES, BackButton } from '../constants';
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
  const [manualPresence, setManualPresence] = useState<{ [id: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Real attendance session state
  const [sessionActive, setSessionActive] = useState(false);
  const [recognizedStudents, setRecognizedStudents] = useState<Map<string, { name: string; confidence: number; avatar: string }>>(new Map());
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeMsg, setFinalizeMsg] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

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
  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return studentList.filter(s => s.classId === selectedClass.id);
  }, [selectedClass, studentList]);

  // Filter for search in manual mode
  const filteredStudents = useMemo(() => {
    return classStudents.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.rollNo.includes(searchTerm)
    );
  }, [classStudents, searchTerm]);

  // Current count based on mode
  const currentCount = isManualMode 
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

      // Merge manual selections if any
      const manualPresentIds = Object.entries(manualPresence).filter(([, v]) => v).map(([id]) => id);
      if (manualPresentIds.length > 0) {
        await attendanceApi.verify(manualPresentIds, []);
      }

      // Finalize
      const result = await attendanceApi.finalize();
      setFinalizeMsg(`Session finalized! ${result.summary?.present_count || 0} students marked present.`);
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
    setSessionError(null);
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
          {groupList.map(cls => (
            <button 
              key={cls.id}
              onClick={() => setSelectedClass(cls)}
              className="bg-white dark:bg-slate-900 p-7 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group tap-active transition-all duration-300"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center transition-all group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:bg-indigo-500 group-hover:scale-105 shadow-sm">
                  <Layers size={24} />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">{cls.name}</h3>
                  <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase mt-2.5">Code {cls.code || cls.id}</p>
                </div>
              </div>
              <ChevronRight size={20} strokeWidth={3} className="text-slate-200 dark:text-slate-800 group-hover:text-indigo-600 transition-all group-hover:translate-x-1" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // No period selection in V2

  return (
    <div className="space-y-6 page-enter pb-10">
      <div className="flex items-center justify-between">
        <BackButton onClick={() => (preSelected && onExit ? onExit() : setSelectedClass(null))} />
        <div className="text-right">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest">
            {isManualMode ? 'Manual Selection' : isScanning ? 'Scanning Active' : 'Scanner Paused'}
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
            <User size={18} /> Manual Fallback
          </button>
        </div>

        {/* Dynamic Display Area */}
        {!isManualMode ? (
          <>
            <div className="rounded-[2.8rem] overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 transition-all duration-500 bg-slate-900">
              <FaceScanner onDetect={handleDetect} isScanning={isScanning} />
            </div>
            
            <div className="grid grid-cols-4 gap-4 px-2">
              <button 
                onClick={handleToggleScan}
                className={`col-span-3 flex items-center justify-center gap-3 py-6 rounded-2xl font-black transition-all duration-300 tracking-widest text-[11px] uppercase shadow-2xl ${
                  isScanning 
                  ? 'bg-amber-500 dark:bg-amber-600 text-white' 
                  : 'bg-indigo-600 dark:bg-indigo-50 text-white'
                } tap-active active:scale-95`}
              >
                {isScanning ? <Pause size={20} fill="currentColor" strokeWidth={0} /> : <Play size={20} fill="currentColor" strokeWidth={0} />}
                {isScanning ? 'Pause Scan' : sessionActive ? 'Resume Scan' : 'Start Face Scan'}
              </button>
              <button 
                onClick={handleReset}
                className="flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 rounded-2xl shadow-sm tap-active transition-all"
              >
                <RotateCcw size={22} strokeWidth={2.5} />
              </button>
            </div>
          </>
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
      </div>
    </div>
  );
};

export default ClassAttendance;
