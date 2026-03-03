
import React, { useState, useEffect } from 'react';
import { PlayCircle, MapPin, CalendarDays, Layers, Users, Sparkles, Table2, X, Clock, ChevronDown } from 'lucide-react';
import { QuickAction, SummaryCard } from './Dashboard';
import { isTestClass } from '../constants';
import { data as dataApi } from '../services/api';

interface StaffHomeProps {
  user: any;
  onNavigate: (path: string, params?: any) => void;
  groupList?: any[];
}

const StaffHome: React.FC<StaffHomeProps> = ({ user, onNavigate, groupList = [] }) => {
  const [showTimetable, setShowTimetable] = useState(false);
  const [weeklyTimetable, setWeeklyTimetable] = useState<any[]>([]);
  const [timetableLoading, setTimetableLoading] = useState(false);

  const now = new Date();
  const hours = now.getHours();
  const today = now.toLocaleDateString('en-US', { weekday: 'long' });
  const todayDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  const assignedGroupId = user?.assignedClassId || '';
  const assignedGroup = groupList.find((g: any) => g.id === assignedGroupId);
  const groupDisplayName = assignedGroup ? assignedGroup.name : (assignedGroupId || 'Unassigned');
  const isReady = Boolean(assignedGroupId);
  const isTest = isTestClass(assignedGroup);

  const handleStartAttendance = () => {
    if (isReady) {
      onNavigate('/attendance', { classId: assignedGroupId });
    }
  };

  const handleOpenTimetable = async () => {
    setShowTimetable(true);
    if (weeklyTimetable.length > 0) return; // Already loaded
    setTimetableLoading(true);
    try {
      const entries = await dataApi.getTimetable({ group_id: assignedGroupId || undefined });
      // Group by day_of_week
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const byDay: Record<number, any[]> = {};
      for (const e of entries) {
        const d = e.day_of_week || 1;
        if (!byDay[d]) byDay[d] = [];
        byDay[d].push(e);
      }
      const schedule = days.map((day, i) => ({
        day,
        shortDay: day.substring(0, 3),
        periods: (byDay[i + 1] || []).sort((a: any, b: any) => a.period - b.period).map((e: any) => ({
          period: e.period,
          subject: e.subject || 'Free',
          time: e.start_time && e.end_time ? `${e.start_time}-${e.end_time}` : '',
        }))
      }));
      setWeeklyTimetable(schedule);
    } catch {
      setWeeklyTimetable([]);
    } finally {
      setTimetableLoading(false);
    }
  };

  return (
    <div className="space-y-8 page-enter">
      {/* Dynamic Hero Banner */}
      <div 
        onClick={handleStartAttendance}
        className={`p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden transition-all duration-500 ${
          isReady 
          ? 'bg-indigo-600 tap-active group cursor-pointer shadow-indigo-500/30' 
          : 'bg-slate-900 dark:bg-slate-900 border border-slate-800 cursor-default opacity-90'
        }`}
      >
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 blur-3xl rounded-full"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-5">
            <span className={`flex h-2.5 w-2.5 rounded-full ${isReady ? 'bg-emerald-400 animate-pulse shadow-[0_0_12px_#34d399]' : 'bg-slate-600'}`}></span>
            <p className="text-white/70 text-[12px] font-bold uppercase tracking-widest">
              {isTest ? 'Test Mode • All Students' : isReady ? 'Ready for Session' : 'No Group Assigned'}
            </p>
          </div>
          
          <h2 className="text-3xl font-black tracking-tight leading-none uppercase mb-8">
            {isReady ? 'Start Attendance' : 'Awaiting Assignment'}
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 px-5 py-4 rounded-2xl border border-white/5 backdrop-blur-md">
               <p className="text-[10px] font-bold uppercase text-white/50 tracking-wider mb-1 flex items-center gap-2">
                 <CalendarDays size={14} /> {todayDate}
               </p>
               <p className="font-bold text-base tracking-tight">{today}</p>
            </div>
              <div className="bg-white/10 px-5 py-4 rounded-2xl border border-white/5 backdrop-blur-md">
               <p className="text-[10px] font-bold uppercase text-white/50 tracking-wider mb-1 flex items-center gap-2">
                 <MapPin size={14} /> Group
               </p>
               <p className="font-bold text-base tracking-tight">{groupDisplayName}</p>
            </div>
          </div>

          {isReady && (
            <button className="w-full mt-6 py-4 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl group-hover:scale-[1.02] transition-transform">
              Begin Face Scanning <PlayCircle size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SummaryCard title="Groups" value={isReady ? 1 : 0} color="bg-indigo-600" />
        <SummaryCard title="Status" value={isReady ? 'Ready' : 'Unassigned'} color="bg-emerald-600" />
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
        <h3 className="text-[12px] font-bold text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-3 mb-6">
          Session Console
        </h3>

        <div className="space-y-4">
          {isReady ? (
            <div 
              onClick={handleStartAttendance}
              className="flex items-center justify-between p-6 border rounded-3xl transition-all bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 tap-active cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base border bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900 dark:text-white">Start Attendance</p>
                  <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-widest">
                    {groupDisplayName}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No group assigned</p>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Timetable Button */}
      <button
        onClick={handleOpenTimetable}
        className="w-full bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-indigo-600/20 flex items-center gap-5 group tap-active transition-all hover:shadow-2xl active:scale-[0.98] relative overflow-hidden"
      >
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shrink-0">
          <Table2 size={24} strokeWidth={2} />
        </div>
        <div className="flex-1 text-left relative z-10">
          <h3 className="text-sm font-black uppercase tracking-tight leading-none">Weekly Timetable</h3>
          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1.5">
            {groupDisplayName} • Full Week
          </p>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-4">
        <QuickAction label="Academic Feed" icon={Layers} color="bg-blue-600" onClick={() => onNavigate('/staff-subjects')} />
        <QuickAction label="Messages" icon={Users} color="bg-emerald-600" onClick={() => onNavigate('/staff-chat')} />
      </div>

      {/* Weekly Timetable Popup */}
      {showTimetable && (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setShowTimetable(false)} />
          <div className="relative w-full sm:max-w-lg max-h-[82vh] overflow-hidden flex flex-col bg-white dark:bg-slate-950 sm:rounded-[2.5rem] rounded-t-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-bottom-6 duration-300">
            {/* Header */}
            <div className="shrink-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 p-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                  <Table2 size={20} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Weekly Schedule</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{groupDisplayName}</p>
                </div>
              </div>
              <button onClick={() => setShowTimetable(false)} className="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Schedule Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
              {timetableLoading ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Loading Schedule...</span>
                </div>
              ) : weeklyTimetable.length === 0 || weeklyTimetable.every(d => d.periods.length === 0) ? (
                <div className="text-center p-12 text-slate-400">
                  <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-bold">No timetable entries found</p>
                  <p className="text-xs text-slate-400 mt-1">Ask your admin to set up the timetable</p>
                </div>
              ) : (
                weeklyTimetable.map((daySchedule, dayIdx) => {
                  const isToday = daySchedule.day === today;
                  const dayColors = [
                    'border-indigo-200 dark:border-indigo-800/30 bg-indigo-50/50 dark:bg-indigo-900/10',
                    'border-emerald-200 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-900/10',
                    'border-amber-200 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-900/10',
                    'border-purple-200 dark:border-purple-800/30 bg-purple-50/50 dark:bg-purple-900/10',
                    'border-rose-200 dark:border-rose-800/30 bg-rose-50/50 dark:bg-rose-900/10',
                  ];
                  return (
                    <div key={daySchedule.day} className={`rounded-2xl border p-4 ${isToday ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-500/20' : dayColors[dayIdx % 5]}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider">{daySchedule.shortDay}</span>
                          {isToday && (
                            <span className="px-2 py-0.5 bg-indigo-600 text-white text-[8px] font-bold uppercase tracking-widest rounded-md">Today</span>
                          )}
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{daySchedule.periods.length} Periods</span>
                      </div>
                      {daySchedule.periods.length > 0 ? (
                        <div className="space-y-1.5">
                          {daySchedule.periods.map((period: any) => (
                            <div key={period.period} className="flex items-center gap-3 bg-white/70 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/50">
                              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[11px] font-black text-slate-600 dark:text-slate-300 shrink-0">
                                {period.period}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate">{period.subject}</p>
                                {period.time && (
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                                    <Clock size={9} /> {period.time}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center py-2">No classes</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffHome;
