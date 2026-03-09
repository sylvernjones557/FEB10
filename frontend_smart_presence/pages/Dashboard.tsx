
import React, { useState, useEffect } from 'react';
import {
  Users,
  Layers,
  ChevronRight,
  GraduationCap,
  Clock,
  Sparkles,
  CalendarDays,
  Table2,
  X,
  ChevronDown,
  TrendingUp,
  LayoutGrid
} from 'lucide-react';
import { data } from '../services/api';
import { MOCK_CLASSES } from '../constants';
import { haptics } from '../services/haptics';

export const QuickAction = ({ label, icon: Icon, onClick, color }: any) => {
  const handleClick = () => {
    haptics.impactLight();
    if (onClick) onClick();
  };
  return (
    <button
      onClick={handleClick}
      className="group glass-card p-6 rounded-[2.5rem] flex flex-col items-center text-center gap-4 tap-active active:scale-95"
    >
      <div className={`w-16 h-16 rounded-[1.8rem] ${color} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center ${color.replace('bg-', 'text-')} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-sm`}>
        <Icon size={28} strokeWidth={2.5} />
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{label}</span>
    </button>
  );
};

export const SummaryCard = ({ title, value, color, icon: Icon }: any) => (
  <div className="group glass-card p-7 rounded-[2.5rem] flex flex-col items-start relative overflow-hidden active:scale-[0.98]">
    <div className={`absolute right-0 top-0 bottom-0 w-1.5 ${color} opacity-40`}></div>
    <div className="flex items-center justify-between w-full mb-5">
      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{title}</span>
      <div className={`p-2.5 rounded-2xl ${color} bg-opacity-10 dark:bg-opacity-20 ${color.replace('bg-', 'text-')} group-hover:scale-110 transition-transform duration-500`}>
        <Icon size={18} strokeWidth={2.5} />
      </div>
    </div>
    <h3 className="text-4xl font-display font-black text-slate-900 dark:text-white tracking-tight flex items-baseline gap-2">
      {value}
      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Total</span>
    </h3>
  </div>
);

const TimetableModal: React.FC<{ onClose: () => void; staffList?: any[]; groupList?: any[] }> = ({ onClose, staffList = [], groupList = [] }) => {
  const classes = groupList.length > 0 ? groupList : MOCK_CLASSES;
  const [selectedClass, setSelectedClass] = useState(classes[0]?.id || '');
  const [isVisible, setIsVisible] = useState(false);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  useEffect(() => {
    const fetchTimetable = async () => {
      setLoading(true);
      try {
        const res = await data.getClassScheduleToday(selectedClass);
        const mapped = res.map((item: any, idx: number) => ({
          period: item.period ?? (idx + 1),
          subject: item.subject,
          teacher: item.teacher_name || 'TBD',
          time: item.time
        }));
        setTimetable(mapped);
      } catch (e) {
        setTimetable([]);
      } finally {
        setLoading(false);
      }
    };
    if (selectedClass) fetchTimetable();
  }, [selectedClass]);

  const handleClose = () => {
    haptics.impactLight();
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const classTeacher = staffList.find(s => s.assignedClassId === selectedClass && s.type === 'CLASS_TEACHER');

  const periodColors = [
    'border-indigo-100 dark:border-indigo-800/30 bg-indigo-50/40',
    'border-emerald-100 dark:border-emerald-800/30 bg-emerald-50/40',
    'border-amber-100 dark:border-amber-800/30 bg-amber-50/40',
    'border-purple-100 dark:border-purple-800/30 bg-purple-50/40',
    'border-rose-100 dark:border-rose-800/30 bg-rose-50/40',
  ];

  return (
    <div className={`fixed inset-0 z-[300] flex items-end sm:items-center justify-center transition-all duration-500 ${isVisible ? 'bg-slate-950/40 backdrop-blur-xl' : 'bg-transparent'}`}>
      <div className="absolute inset-0" onClick={handleClose} />
      <div
        className={`
          relative w-full sm:max-w-xl max-h-[85vh] overflow-hidden flex flex-col
          bg-white dark:bg-slate-950
          sm:rounded-[3rem] rounded-t-[3rem]
          border border-slate-200 dark:border-slate-800/50
          shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]
          transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)
          ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-24 opacity-0 scale-95'}
        `}
      >
        <div className="shrink-0 glass-card border-none p-7 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Table2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-display font-black text-slate-900 dark:text-white tracking-tight uppercase">Timetable</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Daily Schedule</p>
            </div>
          </div>
          <button onClick={handleClose} className="w-12 h-12 flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all tap-active">
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-7 space-y-7 no-scrollbar">
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Class</label>
              <div className="relative group">
                <select
                  value={selectedClass}
                  onChange={e => { haptics.selection(); setSelectedClass(e.target.value); }}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/50 rounded-2xl py-4 pl-6 pr-12 text-slate-900 dark:text-white font-black text-sm outline-none appearance-none hover:border-indigo-500/50 transition-all cursor-pointer"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" size={18} />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Instructor</label>
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/50 rounded-2xl p-3 h-[58px]">
                {classTeacher ? (
                  <>
                    <img src={classTeacher.avatar} alt="" className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm" />
                    <div>
                      <p className="text-[11px] font-black text-slate-900 dark:text-white truncate">{classTeacher.name}</p>
                      <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">Primary</p>
                    </div>
                  </>
                ) : (
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">Unassigned</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <span className="text-[10px] font-black uppercase tracking-widest">Compiling Schedule...</span>
              </div>
            ) : timetable.length === 0 ? (
              <div className="text-center p-12 glass-card rounded-[2rem] text-slate-400 text-[10px] font-black uppercase tracking-widest">No entries for today</div>
            ) : (
              timetable.map((period, idx) => (
                <div key={idx} className={`flex items-center gap-5 p-5 rounded-[1.8rem] border ${periodColors[idx % periodColors.length]} transition-all hover:scale-[1.02] shadow-sm`}>
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-950 flex flex-col items-center justify-center shadow-lg shadow-black/5 shrink-0">
                    <span className="text-xl font-display font-black text-indigo-600 dark:text-indigo-400">{period.period}</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase mt-0.5">Pd</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">{period.subject}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-slate-400">
                      <Clock size={12} strokeWidth={3} />
                      <span className="text-[10px] font-black uppercase tracking-widest tabular-nums">{period.time}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface DashboardProps {
  studentCount: number;
  staffCount: number;
  onNavigate: (path: string) => void;
  staffList?: any[];
  groupList?: any[];
}

const AdminDashboard: React.FC<DashboardProps> = ({ studentCount, staffCount, onNavigate, staffList = [], groupList = [] }) => {
  const [stats, setStats] = useState({ presence_index: 0, daily_success: 0, total_enrollment: 0, avg_latency: 0 });
  const [liveClasses, setLiveClasses] = useState<{ id: string, name: string, status: string }[]>([]);
  const [showTimetable, setShowTimetable] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, classesData] = await Promise.all([data.getStats(), data.getLiveClasses()]);
        setStats(statsData);
        setLiveClasses(classesData);
      } catch (e) {
        console.error("Dashboard error", e);
      }
    };
    fetchData();
  }, []);

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="space-y-10 page-enter pb-20">
      {/* Dynamic Header Part */}
      <div className="space-y-2">
        <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.4em] mb-1">Administrative Console</p>
        <div className="flex items-center justify-between">
          <h1 className="text-5xl font-display font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">Overview</h1>
          <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900/60 p-2 rounded-2xl border border-slate-200 dark:border-slate-800/50">
            <CalendarDays size={18} className="text-indigo-600" strokeWidth={2.5} />
            <span className="text-[11px] font-black text-slate-900 dark:text-white tracking-widest uppercase">{today}</span>
          </div>
        </div>
      </div>

      {/* Hero Stats Card */}
      <div className="glass-card p-10 rounded-[3.5rem] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full translate-x-20 -translate-y-20"></div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]"></span>
              <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em]">System Health: Operational</p>
            </div>
            <div className="space-y-2">
              <h2 className="text-6xl font-display font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">{stats.presence_index}%</h2>
              <p className="text-[10px] font-black text-indigo-600/60 dark:text-indigo-400/60 uppercase tracking-[0.4em]">Presence Index Efficiency</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="bg-emerald-500/10 dark:bg-emerald-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
                <TrendingUp size={14} className="text-emerald-500" />
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{stats.daily_success}% Success</span>
              </div>
              <div className="bg-amber-500/10 dark:bg-amber-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
                <Clock size={14} className="text-amber-500" />
                <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">{stats.avg_latency}s Latency</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-end space-y-4">
            <button
              onClick={() => { haptics.impactHeavy(); setShowTimetable(true); }}
              className="w-full bg-indigo-600 hover:bg-white hover:text-indigo-600 dark:hover:bg-indigo-500 dark:hover:text-white p-6 rounded-[2rem] text-white shadow-2xl shadow-indigo-600/30 transition-all duration-500 flex items-center justify-between group tap-active"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                  <Table2 size={24} />
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-black uppercase tracking-widest">Access Schedule</p>
                  <p className="text-sm font-black uppercase tracking-tight opacity-70">Main Timetable</p>
                </div>
              </div>
              <ChevronRight size={24} className="opacity-40 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => onNavigate('/reports')} className="w-full glass-card border-slate-200/50 dark:border-slate-800/50 p-6 rounded-[2rem] text-slate-900 dark:text-white flex items-center justify-between group tap-active">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center shrink-0">
                  <TrendingUp size={24} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">View Dossier</p>
                  <p className="text-sm font-black uppercase tracking-tight">Analytics Suite</p>
                </div>
              </div>
              <ChevronRight size={24} className="opacity-20 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <button onClick={() => { haptics.impactMedium(); onNavigate('/students'); }} className="text-left">
          <SummaryCard title="Students" value={studentCount} color="bg-indigo-600" icon={Users} />
        </button>
        <button onClick={() => { haptics.impactMedium(); onNavigate('/staff'); }} className="text-left">
          <SummaryCard title="Instructors" value={staffCount} color="bg-emerald-600" icon={GraduationCap} />
        </button>
      </div>

      <div className="glass-card p-10 rounded-[4rem] relative">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white tracking-tight uppercase">Live Sessions</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Current Active Learning Channels</p>
          </div>
          <div className="flex items-center gap-3 px-5 py-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full border border-emerald-500/20">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">Live Stream</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {liveClasses.length > 0 ? liveClasses.map((cls, i) => (
            <div
              key={cls.id}
              onClick={() => onNavigate('/classes')}
              className="flex items-center justify-between p-7 bg-white dark:bg-slate-950 border border-slate-100 dark:border-white/5 rounded-[2.2rem] tap-active group hover:bg-indigo-50 dark:hover:bg-indigo-900/20 shadow-sm transition-all saturate-[1.2]"
            >
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center font-display font-black text-slate-400 group-hover:text-indigo-600 text-xl border border-slate-100 dark:border-slate-800 transition-colors">
                  {(i + 1).toString().padStart(2, '0')}
                </div>
                <div>
                  <p className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase">{cls.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Active Status</p>
                </div>
              </div>
              <ChevronRight size={24} className="text-slate-200 group-hover:text-indigo-600 transition-all group-hover:translate-x-1" />
            </div>
          )) : (
            <div className="col-span-full py-20 text-center glass-card border-dashed rounded-[3rem]">
              <Sparkles size={40} className="mx-auto text-slate-200 mb-4" />
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Awaiting Active sessions</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <QuickAction label="Academic Groups" icon={Layers} color="bg-amber-600" onClick={() => onNavigate('/classes')} />
        <QuickAction label="Biometrics" icon={Users} color="bg-blue-600" onClick={() => onNavigate('/students')} />
        <QuickAction label="Console" icon={LayoutGrid} color="bg-slate-800" onClick={() => onNavigate('/dashboard')} />
      </div>

      {showTimetable && (
        <TimetableModal onClose={() => setShowTimetable(false)} staffList={staffList} groupList={groupList} />
      )}
    </div>
  );
};

export default AdminDashboard;
