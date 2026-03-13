
import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  Download,
  Activity,
  Globe,
  Lock,
  ChevronRight
} from 'lucide-react';
import { BackButton } from '../constants';
import { data } from '../services/api';

const InstitutionalReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [stats, setStats] = useState({
    presence_index: 0,
    net_increase: 0,
    total_enrollment: 0,
    avg_latency: 0,
    daily_success: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await data.getStats();
        setStats(result);
      } catch (e) {
        console.error("Failed to fetch stats", e);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <BackButton onClick={onBack} />
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Institutional Analytics</p>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Global Report</h2>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.8rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-10 relative overflow-hidden transition-all duration-500">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full translate-x-20 -translate-y-20"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/20">
              <Globe size={32} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">Presence Index</h3>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                <Activity size={12} className="text-emerald-500" /> System Efficacy: {stats.presence_index}%
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="flex items-center gap-2 justify-start sm:justify-end text-emerald-500 font-black text-2xl tracking-tighter">
              +{stats.net_increase}% <TrendingUp size={24} />
            </div>
            <p className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] mt-1">Net Performance Increase</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
          {[
            { label: 'Total Enrollment', value: `${stats.total_enrollment} Souls`, icon: Users, color: 'text-indigo-600 dark:text-indigo-400' },
            { label: 'Avg Sync Latency', value: `${stats.avg_latency} Seconds`, icon: Clock, color: 'text-amber-500 dark:text-amber-400' },
            { label: 'Daily Success', value: `${stats.daily_success}% Rate`, icon: CheckCircle2, color: 'text-emerald-500 dark:text-emerald-400' }
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 p-6 rounded-3xl flex flex-col gap-4 group hover:border-indigo-500/30 transition-all duration-300 shadow-inner">
              <div className="flex items-center justify-between">
                <stat.icon size={20} className={stat.color} />
                <ArrowUpRight size={16} className="text-slate-300 dark:text-slate-700 group-hover:text-indigo-500" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{stat.label}</p>
                <p className="text-lg font-black text-slate-900 dark:text-white mt-1 tracking-tight">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 relative z-10">
          <button className="w-full py-5 bg-indigo-600 dark:bg-indigo-600 text-white font-black rounded-[1.8rem] text-[11px] uppercase tracking-[0.3em] shadow-2xl shadow-indigo-600/20 flex items-center justify-center gap-3 tap-active hover:bg-indigo-700 transition-colors">
            <Download size={18} /> Export Performance Dossier
          </button>
        </div>
      </div>

      {/* Historical Vault Access - LOCKED STATE */}
      <div className="bg-slate-50 dark:bg-slate-900/40 p-8 rounded-[2.8rem] text-slate-400 dark:text-slate-600 border-2 border-dashed border-slate-200 dark:border-slate-800 relative overflow-hidden group">
        <div className="relative z-10 flex items-center justify-between opacity-60 grayscale group-hover:grayscale-0 transition-all duration-500">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-slate-200 dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-700">
              <FileText size={28} className="text-slate-400 dark:text-slate-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-lg font-black tracking-tight leading-none uppercase">Archived Analytics</h4>
                <span className="px-2 py-0.5 bg-amber-500 text-white text-[8px] font-black uppercase rounded-md tracking-widest">LOCKED</span>
              </div>
              <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2 flex items-center gap-2">
                Coming Soon in Next Governance Cycle
              </p>
            </div>
          </div>
          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <Lock size={20} className="text-slate-400 dark:text-slate-600" />
          </div>
        </div>

        {/* Subtle overlay */}
        <div className="absolute inset-0 bg-white/5 dark:bg-black/5 pointer-events-none"></div>
      </div>
    </div>
  );
};

export default InstitutionalReport;
