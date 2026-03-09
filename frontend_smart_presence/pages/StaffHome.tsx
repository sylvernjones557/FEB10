
import React, { useState, useEffect } from 'react';
import {
  Camera,
  Calendar,
  Clock,
  CheckCircle2,
  Users,
  ChevronRight,
  TrendingUp,
  Award,
  BookOpen,
  ArrowUpRight,
  UserCheck,
  LayoutGrid
} from 'lucide-react';
import { data } from '../services/api';
import { haptics } from '../services/haptics';

interface StaffHomeProps {
  staff: any;
  onNavigate: (path: string) => void;
  studentCount: number;
}

const StaffHome: React.FC<StaffHomeProps> = ({ staff, onNavigate, studentCount }) => {
  const [personalStats, setPersonalStats] = useState({
    classes_today: 0,
    attendance_rate: 0,
    total_sessions: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await data.getStaffStats(staff.id);
        setPersonalStats(stats);
      } catch (e) {
        // Fallback or handle error
      }
    };
    fetchStats();
  }, [staff.id]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-10 page-enter pb-20">
      {/* Premium Profile Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <img src={staff.avatar} alt="" className="relative w-20 h-20 rounded-[2rem] object-cover border-2 border-white dark:border-slate-800 shadow-2xl transition-transform group-hover:scale-105" />
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 rounded-xl border-4 border-white dark:border-slate-950 flex items-center justify-center">
                <Award size={14} className="text-white" />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mb-1">Staff Portal</p>
              <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tighter leading-none uppercase">Hello, {staff.name.split(' ')[0]}</h2>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800/50">
              <Calendar size={16} className="text-indigo-600" />
              <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">{today}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Action Hub */}
      <div className="glass-card p-10 rounded-[3.5rem] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full translate-x-20 -translate-y-20 group-hover:bg-emerald-500/20 transition-all duration-700"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                    <img src={`https://ui-avatars.com/api/?name=S${i}&background=random&color=fff&bold=true`} alt="" />
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white">
                  +{studentCount}
                </div>
              </div>
              <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active Academic Group</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-4xl font-display font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">Record<br />Attendance</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xs">Initialize biometric verification for the currently assigned session.</p>
            </div>

            <button
              onClick={() => { haptics.impactHeavy(); onNavigate('/classes'); }}
              className="px-10 py-5 bg-indigo-600 text-white font-display font-black rounded-3xl text-[12px] uppercase tracking-[0.3em] shadow-2xl shadow-indigo-600/30 flex items-center gap-4 tap-active saturate-[1.2] hover:bg-indigo-700 transition-all"
            >
              <Camera size={20} /> Launch AI Scanner
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="p-7 rounded-[2.5rem] bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20 flex flex-col justify-between group hover:scale-[1.02] transition-all">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600">
                  <Clock size={20} />
                </div>
                <ArrowUpRight size={18} className="text-emerald-300 group-hover:text-emerald-500 transition-colors" />
              </div>
              <div className="mt-8">
                <p className="text-3xl font-display font-black text-slate-900 dark:text-white tabular-nums">{personalStats.classes_today || '02'}</p>
                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-500/60 uppercase tracking-widest mt-1">Sessions Today</p>
              </div>
            </div>
            <div className="p-7 rounded-[2.5rem] bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 flex flex-col justify-between group hover:scale-[1.02] transition-all">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600">
                  <Users size={20} />
                </div>
                <ArrowUpRight size={18} className="text-indigo-300 group-hover:text-indigo-500 transition-colors" />
              </div>
              <div className="mt-8">
                <p className="text-3xl font-display font-black text-slate-900 dark:text-white tabular-nums">{personalStats.attendance_rate || '94'}%</p>
                <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-500/60 uppercase tracking-widest mt-1">Avg. Presence</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => { haptics.impactMedium(); onNavigate('/reports'); }}
          className="glass-card p-8 rounded-[3rem] flex items-center justify-between group tap-active"
        >
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-[1.8rem] flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-sm border border-slate-100 dark:border-slate-800">
              <BookOpen size={28} />
            </div>
            <div className="text-left">
              <h4 className="text-xl font-display font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">Attendance History</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{personalStats.total_sessions || '24'} Total Sessions Logged</p>
            </div>
          </div>
          <ChevronRight size={24} className="text-slate-200 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
        </button>

        <button
          onClick={() => { haptics.impactLight(); onNavigate('/classes'); }}
          className="glass-card p-8 rounded-[3rem] flex items-center justify-between group tap-active"
        >
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-[1.8rem] flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-sm border border-slate-100 dark:border-slate-800">
              <LayoutGrid size={28} />
            </div>
            <div className="text-left">
              <h4 className="text-xl font-display font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">Class Dossier</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Manage Group Rosters</p>
            </div>
          </div>
          <ChevronRight size={24} className="text-slate-200 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
        </button>
      </div>

      {/* Achievement Banner */}
      <div className="bg-indigo-900/10 dark:bg-indigo-500/20 p-8 rounded-[3rem] border border-indigo-200 dark:border-indigo-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-600/10 rounded-full flex items-center justify-center">
            <TrendingUp size={28} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-base font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">System Efficiency Peak</p>
            <p className="text-[10px] font-bold text-slate-500 dark:text-indigo-400/60 uppercase tracking-widest mt-1">Your department is leading in biometric adoption</p>
          </div>
        </div>
        <div className="px-6 py-3 bg-white dark:bg-slate-950 rounded-2xl flex items-center gap-3 border border-indigo-100 dark:border-indigo-800">
          <UserCheck size={18} className="text-emerald-500" />
          <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Top Performance</span>
        </div>
      </div>
    </div>
  );
};

export default StaffHome;
