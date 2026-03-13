
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
  ChevronDown
} from 'lucide-react';
import { data } from '../services/api';
import { MOCK_CLASSES } from '../constants';

export const QuickAction = ({ label, icon: Icon, onClick, color }: any) => (
  <button
    onClick={onClick}
    className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center text-center gap-3 tap-active transition-all hover:border-indigo-500"
  >
    <div className={`w-14 h-14 rounded-2xl ${color} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center ${color.replace('bg-', 'text-')}`}>
      <Icon size={28} strokeWidth={2.5} />
    </div>
    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</span>
  </button>
);

export const SummaryCard = ({ title, value, color }: any) => (
  <div className="bg-white dark:bg-slate-900 p-7 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-start relative overflow-hidden transition-all">
    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${color}`}></div>
    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{title}</span>
    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">{value}</h3>
  </div>
);

// Legacy timetable constants removed in V2 (kept empty for compatibility)
const TIMETABLE_DATA: Record<string, { period: number; subject: string; teacher: string; time: string }[]> = {};
const DEFAULT_TIMETABLE = [];

const formatClassLabel = (c: typeof MOCK_CLASSES[0]) => {
  return c.code ? `${c.name} (${c.code})` : c.name;
};

// Timetable Modal
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
        console.error("Failed to fetch timetable", e);
        setTimetable([]);
      } finally {
        setLoading(false);
      }
    };
    if (selectedClass) {
      fetchTimetable();
    }
  }, [selectedClass]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const classObj = classes.find(c => c.id === selectedClass);
  const classTeacher = staffList.find(s => s.assignedClassId === selectedClass && s.type === 'CLASS_TEACHER');

  const periodColors = [
    'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/30',
    'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30',
    'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/30',
    'bg-purple-50/50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-800/30',
    'bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800/30',
  ];

  const periodTextColors = [
    'text-indigo-600 dark:text-indigo-400',
    'text-emerald-600 dark:text-emerald-400',
    'text-amber-600 dark:text-amber-400',
    'text-purple-600 dark:text-purple-400',
    'text-rose-600 dark:text-rose-400',
  ];

  return (
    <div className={`fixed inset-0 z-[300] flex items-end sm:items-center justify-center transition-all duration-300 ${isVisible ? 'bg-black/40 backdrop-blur-md' : 'bg-transparent'}`}>
      <div className="absolute inset-0" onClick={handleClose} />
      <div
        className={`
          relative w-full sm:max-w-xl max-h-[85vh] overflow-hidden flex flex-col
          bg-white dark:bg-slate-950
          sm:rounded-[2.5rem] rounded-t-[2.5rem]
          border border-slate-200 dark:border-slate-800
          shadow-2xl
          transition-all duration-300 ease-out
          ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95'}
        `}
      >
        {/* Header */}
        <div className="shrink-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <Table2 size={20} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              Class Timetable
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Class Selector & Teacher Info */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="relative group">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block ml-1">Select Class</label>
              <div className="relative">
                <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 z-10 group-focus-within:text-indigo-500" size={18} />
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" size={16} />
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-11 pr-10 text-slate-900 dark:text-white font-bold text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none appearance-none transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{formatClassLabel(c)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="relative">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block ml-1">Class Teacher</label>
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 pr-4 h-[50px]">
                {classTeacher ? (
                  <>
                    <img
                      src={classTeacher.avatar}
                      alt={classTeacher.name}
                      className="w-[34px] h-[34px] rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">{classTeacher.name}</p>
                      <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest truncate">Assigned</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-[34px] h-[34px] rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <Users size={16} className="text-slate-400 dark:text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 truncate">No Teacher</p>
                      <p className="text-[9px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest truncate">Unassigned</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-slate-100 dark:bg-slate-800/50 my-2"></div>

          {/* Timetable Periods */}
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Schedule</p>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{timetable.length} Periods</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-3">
                {loading ? (
                  <div className="flex flex-col items-center justify-center p-8 text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Loading Schedule...</span>
                  </div>
                ) : timetable.length === 0 ? (
                  <div className="text-center p-8 text-slate-400 text-xs font-bold uppercase tracking-widest">No schedule available for today</div>
                ) : (
                  timetable.map((period, idx) => (
                    <div
                      key={period.period}
                      className={`group relative flex items-center gap-4 p-3.5 rounded-2xl border ${periodColors[idx % periodColors.length]} transition-all hover:scale-[1.01] hover:shadow-sm bg-opacity-40 backdrop-blur-sm`}
                      style={{ animationDelay: `${idx * 70}ms` }}
                    >
                      {/* Period number */}
                      <div className={`w-12 h-12 rounded-xl bg-white dark:bg-slate-950/80 border border-slate-100 dark:border-slate-800/50 flex flex-col items-center justify-center shadow-sm shrink-0`}>
                        <span className={`text-[15px] font-black leading-none ${periodTextColors[idx % periodTextColors.length]}`}>{period.period}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Pd</span>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                        <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight truncate">{period.subject}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock size={12} className="text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest tabular-nums">{period.time}</span>
                        </div>
                      </div>

                      {/* Teacher Pill */}
                      <div className="shrink-0 flex items-center gap-1.5 bg-white/60 dark:bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800/30">
                        <div className={`w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 ${period.teacher !== 'TBD' ? 'bg-emerald-400' : ''}`}></div>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest max-w-[80px] truncate">
                          {period.teacher}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
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
  const [stats, setStats] = useState({
    presence_index: 0,
    daily_success: 0,
    total_enrollment: 0,
    avg_latency: 0
  });
  const [liveClasses, setLiveClasses] = useState<{ id: string, name: string, status: string }[]>([]);
  const [showTimetable, setShowTimetable] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsData = await data.getStats();
        setStats(statsData);
        const classesData = await data.getLiveClasses();
        setLiveClasses(classesData);
      } catch (e) {
        console.error("Failed to load dashboard data", e);
      }
    };
    fetchData();
  }, []);

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="space-y-8 page-enter">
      <div
        className="bg-slate-950 dark:bg-indigo-600 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group transition-all"
      >
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 blur-3xl rounded-full"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <p className="text-white/70 text-[12px] font-bold uppercase tracking-widest">Main Hub</p>
          </div>
          <h2 className="text-3xl font-black tracking-tight leading-none uppercase mb-8">Home<br />Summary</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 px-5 py-4 rounded-2xl border border-white/5 backdrop-blur-md">
              <p className="text-[10px] font-bold uppercase text-white/50 tracking-wider mb-1 flex items-center gap-2">
                <CalendarDays size={14} /> {today}
              </p>
              <p className="font-bold text-base tracking-tight">Active</p>
            </div>
            <div className="bg-white/10 px-5 py-4 rounded-2xl border border-white/5 backdrop-blur-md">
              <p className="text-[10px] font-bold uppercase text-white/50 tracking-wider mb-1 flex items-center gap-2">
                <Sparkles size={14} className="text-amber-400" /> Data
              </p>
              <p className="font-bold text-base tracking-tight">Verified {stats.daily_success}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Timetable Big Button */}
      <button
        onClick={() => setShowTimetable(true)}
        className="w-full bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 dark:from-indigo-500 dark:via-indigo-600 dark:to-purple-600 p-7 rounded-[2.5rem] text-white shadow-xl shadow-indigo-600/20 dark:shadow-indigo-500/30 flex items-center gap-5 group tap-active transition-all hover:shadow-2xl hover:shadow-indigo-600/30 active:scale-[0.98] relative overflow-hidden"
      >
        {/* Decorative elements */}
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-1/2 w-64 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

        <div className="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shrink-0">
          <Table2 size={28} strokeWidth={2} />
        </div>
        <div className="flex-1 text-left relative z-10">
          <h3 className="text-base font-black uppercase tracking-tight leading-none">View Timetable</h3>
          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-2">
            {(groupList.length || MOCK_CLASSES.length)} Classes • Daily Schedule
          </p>
        </div>
        <ChevronRight size={22} className="text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
      </button>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => onNavigate('/students')} className="text-left tap-active">
          <SummaryCard title="Students" value={studentCount} color="bg-indigo-600" />
        </button>
        <button onClick={() => onNavigate('/staff')} className="text-left tap-active">
          <SummaryCard title="Teachers" value={staffCount} color="bg-emerald-600" />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[12px] font-bold text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
            <Clock size={20} className="text-indigo-600" />
            Live Classes
          </h3>
          <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 rounded-lg text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Now</span>
        </div>

        <div className="space-y-4">
          {liveClasses.map((cls, i) => (
            <div
              key={cls.id}
              onClick={() => onNavigate('/classes')}
              className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-3xl tap-active group hover:bg-white dark:hover:bg-slate-900 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center font-black text-slate-600 dark:text-white text-base">
                  {i + 1}
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900 dark:text-slate-200">{cls.name}</p>
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest">Ongoing</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-600 transition-all group-hover:translate-x-1" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <QuickAction label="Classes" icon={Layers} color="bg-amber-600" onClick={() => onNavigate('/classes')} />
        <QuickAction label="Students" icon={Users} color="bg-blue-600" onClick={() => onNavigate('/students')} />
        <QuickAction label="Teachers" icon={GraduationCap} color="bg-purple-600" onClick={() => onNavigate('/staff')} />
      </div>

      {/* Timetable Modal */}
      {showTimetable && (
        <TimetableModal onClose={() => setShowTimetable(false)} staffList={staffList} groupList={groupList} />
      )}
    </div>
  );
};

export default AdminDashboard;
