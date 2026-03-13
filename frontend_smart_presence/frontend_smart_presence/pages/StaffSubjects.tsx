
import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronRight, X, CheckCircle2, AlertCircle, TrendingUp, Activity } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';
import { MOCK_CLASSES } from '../constants';
import { attendance as attendanceApi, data as dataApi } from '../services/api';

const StaffSubjects: React.FC<{ user: any; groupList?: any[]; studentList?: any[] }> = ({ user, groupList = MOCK_CLASSES, studentList = [] }) => {
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [perfData, setPerfData] = useState<{name: string; value: number}[]>([]);
  const [topPresent, setTopPresent] = useState<{name: string; score: string; id: string}[]>([]);
  const [topAbsent, setTopAbsent] = useState<{name: string; score: string; id: string}[]>([]);
  
  const subjects = [
    { name: 'Group Attendance', code: user.assignedClassId || 'g1', classId: user.assignedClassId || 'g1', avg: '--' }
  ];

  // Fetch real attendance data when subject detail is opened
  useEffect(() => {
    if (!selectedSubject) return;
    const fetchData = async () => {
      try {
        // Try to get weekly history for attendance chart
        const history = await attendanceApi.getStatus().catch(() => null);
        // Get students for the class
        const classStudents = studentList.filter((s: any) => 
          s.classId === selectedSubject.classId || !selectedSubject.classId
        );
        
        // If we have students, show them sorted by face registration status as proxy
        if (classStudents.length > 0) {
          const registered = classStudents.filter((s: any) => s.faceDataRegistered);
          const unregistered = classStudents.filter((s: any) => !s.faceDataRegistered);
          
          setTopPresent(registered.slice(0, 3).map((s: any) => ({
            name: s.name, score: 'Registered', id: s.id
          })));
          setTopAbsent(unregistered.slice(0, 3).map((s: any) => ({
            name: s.name, score: 'No Face Data', id: s.id
          })));
        } else {
          setTopPresent([]);
          setTopAbsent([]);
        }
        
        // Simple placeholder chart data (no mock random values)
        setPerfData([]);
      } catch {
        setPerfData([]);
        setTopPresent([]);
        setTopAbsent([]);
      }
    };
    fetchData();
  }, [selectedSubject, studentList]);

  const renderSubjectDetail = (sub: any) => {
    const classObj = groupList.find(c => c.id === sub.classId);

    return (
      <div className="fixed inset-0 z-[1001] flex flex-col bg-slate-50 dark:bg-[#020617] animate-in fade-in duration-300 overflow-hidden">
        {/* Header Section */}
        <div className="px-6 h-20 flex items-center justify-between border-b border-slate-200 dark:border-white/5 bg-white dark:bg-[#020617] shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                <Activity size={20} />
             </div>
             <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{sub.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Class Stats</p>
             </div>
          </div>
          <button 
            onClick={() => setSelectedSubject(null)} 
            className="w-10 h-10 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl flex items-center justify-center tap-active border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar pb-32">
          {/* Main Visual Card - Mirroring Screenshot Aesthetic */}
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-200 dark:border-white/5 shadow-2xl relative overflow-hidden transition-colors duration-500">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
            
            <div className="relative z-10 space-y-8">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-3 text-indigo-600 dark:text-indigo-400">
                    <TrendingUp size={16} />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Attendance Index</p>
                  </div>
                  <h4 className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{sub.avg}</h4>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">Rate</p>
                </div>
                <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-xl border border-emerald-500/20 text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Stable
                </div>
              </div>

              {/* Minimal Wave Graph - only shown when data exists */}
              {perfData.length > 0 && (
              <div className="h-44 w-full -mx-4 -mb-8 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={perfData}>
                    <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                    <defs>
                      <linearGradient id="colorWave" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#818CF8" 
                      fill="url(#colorWave)" 
                      strokeWidth={5} 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 relative z-20">
                <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-[2rem] border border-slate-100 dark:border-white/5">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Group</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{classObj?.name || 'Group'}</p>
                </div>
                <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-[2rem] border border-slate-100 dark:border-white/5">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Total Pupils</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {studentList.filter((s: any) => s.classId === sub.classId || !sub.classId).length} Active
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* List Section */}
          <div className="space-y-10 px-2 pt-2">
            {topPresent.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-[11px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <CheckCircle2 size={16} /> Face Registered Students
              </h4>
              <div className="space-y-3">
                {topPresent.map((std, i) => (
                  <div key={std.id} className="flex items-center gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[1.8rem] transition-all">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-emerald-500 font-black border border-slate-100 dark:border-white/5">
                      {i+1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-900 dark:text-white">{std.name}</p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1">Registered</p>
                    </div>
                    <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-black">{std.score}</div>
                  </div>
                ))}
              </div>
            </div>
            )}

            {topAbsent.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-[11px] font-black text-rose-600 dark:text-rose-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <AlertCircle size={16} /> Needs Face Registration
              </h4>
              <div className="space-y-3">
                {topAbsent.map((std, i) => (
                  <div key={std.id} className="flex items-center gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[1.8rem] transition-all">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-rose-500 font-black border border-slate-100 dark:border-white/5">
                      {i+1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-900 dark:text-white">{std.name}</p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1">Needs Review</p>
                    </div>
                    <div className="bg-rose-500/10 text-rose-600 dark:text-rose-400 px-3 py-1.5 rounded-xl text-xs font-black">{std.score}</div>
                  </div>
                ))}
              </div>
            </div>
            )}

            {topPresent.length === 0 && topAbsent.length === 0 && (
              <div className="text-center py-10">
                <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">No student data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Button Section */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white dark:bg-[#020617] border-t border-slate-200 dark:border-white/5 z-[1002] safe-bottom shadow-[0_-20px_40px_rgba(0,0,0,0.05)]">
           <button 
             onClick={() => setSelectedSubject(null)}
             className="w-full py-5 bg-indigo-600 dark:bg-white text-white dark:text-slate-950 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] tap-active shadow-xl transition-all active:scale-[0.98]"
           >
             Finish Review
           </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-10 px-1">
      <div className="space-y-8 page-enter">
        <div>
          <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">My Groups</p>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none mt-1">Group Insights</h2>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {subjects.map((sub) => {
            const classObj = groupList.find(c => c.id === sub.classId);
            return (
              <div 
                key={sub.code}
                onClick={() => setSelectedSubject(sub)}
                className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm tap-active cursor-pointer group flex items-center justify-between hover:border-indigo-500 transition-all duration-500 relative overflow-hidden"
              >
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="flex items-center gap-6 relative z-10">
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <BookOpen size={28} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white leading-none uppercase tracking-tight">{sub.name}</h4>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2">{classObj?.name || 'Group'} ({classObj?.code || classObj?.id})</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4 relative z-10">
                  <div className="flex flex-col items-end">
                    <span className="text-emerald-600 dark:text-emerald-500 font-black text-2xl tracking-tighter leading-none">{sub.avg}</span>
                    <p className="text-[8px] font-black text-slate-400 uppercase mt-1">Attendance</p>
                  </div>
                  <ChevronRight size={20} strokeWidth={3} className="text-slate-200 dark:text-slate-800 group-hover:text-indigo-600 transition-all group-hover:translate-x-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedSubject && renderSubjectDetail(selectedSubject)}
    </div>
  );
};

export default StaffSubjects;
