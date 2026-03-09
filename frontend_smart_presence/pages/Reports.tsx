
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
  Calendar,
  Filter,
  Search,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  Zap,
  BarChart3,
  Dna
} from 'lucide-react';
import { BackButton } from '../constants';
import { data } from '../services/api';
import { haptics } from '../services/haptics';

const InstitutionalReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [stats, setStats] = useState({
    presence_index: 0,
    net_increase: 0,
    total_enrollment: 0,
    avg_latency: 0,
    daily_success: 0
  });
  const [activeTab, setActiveTab] = useState<'analytics' | 'history'>('analytics');
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleTabChange = (tab: 'analytics' | 'history') => {
    haptics.selection();
    setActiveTab(tab);
  };

  const attendanceLog = [
    { id: 1, name: 'Rahul Sharma', class: 'BCA 2nd Year', time: '10:15 AM', status: 'verified', method: 'face' },
    { id: 2, name: 'Priya Verma', class: 'BCA 2nd Year', time: '10:17 AM', status: 'verified', method: 'face' },
    { id: 3, name: 'Amit Patel', class: 'BCA 2nd Year', time: '10:20 AM', status: 'flagged', method: 'manual' },
    { id: 4, name: 'Sanya Gupta', class: 'BCA 2nd Year', time: '10:22 AM', status: 'verified', method: 'face' },
    { id: 5, name: 'Vikram Singh', class: 'BCA 2nd Year', time: '10:25 AM', status: 'verified', method: 'face' },
  ];

  return (
    <div className="space-y-10 page-enter font-main pb-20">
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-sm tap-active hover:bg-slate-50 transition-all"><ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" /></button>

          <div className="flex p-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.8rem]">
            <button
              onClick={() => handleTabChange('analytics')}
              className={`px-6 py-3 rounded-[1.4rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${activeTab === 'analytics' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-500'}`}
            >
              <BarChart3 size={16} /> Intelligence
            </button>
            <button
              onClick={() => handleTabChange('history')}
              className={`px-6 py-3 rounded-[1.4rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-500'}`}
            >
              <Activity size={16} /> Live Logs
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.4em]">Academic Sentinel v4.0</p>
          <h2 className="text-5xl font-display font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">
            {activeTab === 'analytics' ? 'Performance' : 'Surveillance'}
          </h2>
        </div>
      </div>

      {activeTab === 'analytics' ? (
        <div className="space-y-8">
          {/* Executive Summary Card */}
          <div className="glass-card p-10 rounded-[3.5rem] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[130px] rounded-full translate-x-1/4 -translate-y-1/4"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full -translate-x-1/4 translate-y-1/4"></div>

            <div className="relative z-10 flex flex-col gap-12">
              <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="flex items-center gap-8">
                  <div className="w-24 h-24 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-600/40 relative">
                    <Dna size={48} className="animate-pulse" />
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 border-4 border-white dark:border-slate-900 rounded-full flex items-center justify-center">
                      <CheckCircle2 size={16} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-display font-black text-slate-900 dark:text-white leading-none tracking-tight">System Integrity</h3>
                    <div className="flex items-center gap-4 mt-4">
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">Operational</div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">March 09 &middot; Cycle Active</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center md:items-end">
                  <div className="text-6xl font-display font-black text-indigo-600 dark:text-indigo-400 tracking-tighter tabular-nums mb-1">{stats.presence_index}%</div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Mean Presence Efficiency</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Active Enrollment', value: stats.total_enrollment, trend: `+${stats.net_increase}%`, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
                  { label: 'System Latency', value: `${stats.avg_latency}s`, trend: 'Nominal', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                  { label: 'Recognition Efficacy', value: `${stats.daily_success}%`, trend: 'Peak', icon: Eye, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
                ].map((stat) => (
                  <div key={stat.label} className="p-8 rounded-[2.5rem] bg-white/50 dark:bg-slate-900/60 border border-slate-100 dark:border-white/5 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <div className="flex justify-between items-start mb-6">
                      <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
                        <stat.icon size={24} />
                      </div>
                      <span className="text-[9px] font-black px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase tracking-widest">{stat.trend}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className="text-3xl font-display font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full py-6 bg-[#020617] dark:bg-indigo-600 text-white font-display font-black rounded-[2rem] text-[12px] uppercase tracking-[0.4em] shadow-2xl shadow-indigo-600/20 flex items-center justify-center gap-4 transition-all hover:saturate-150 active:scale-[0.98] tap-active">
                <FileText size={22} /> Compile Institutional Dossier
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Filter live stream..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-16 bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-[1.8rem] pl-16 pr-8 text-slate-900 dark:text-white font-black text-sm outline-none focus:border-indigo-600 transition-all shadow-sm"
              />
            </div>
            <button className="w-16 h-16 bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-[1.8rem] flex items-center justify-center text-slate-400 hover:text-indigo-500 transition-colors tap-active">
              <Filter size={24} />
            </button>
          </div>

          <div className="space-y-4">
            {attendanceLog.map((log, idx) => (
              <div
                key={log.id}
                className="glass-card p-6 rounded-[2.5rem] flex items-center justify-between group hover:scale-[1.01] active:scale-[0.99] animate-in"
                style={{ animationDelay: `${idx * 150}ms` }}
              >
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(log.name)}&background=818cf8&color=fff&bold=true`} alt="" className="w-16 h-16 rounded-[1.5rem] object-cover border-2 border-white dark:border-slate-800 shadow-xl" />
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center shadow-lg ${log.status === 'verified' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                      {log.status === 'verified' ? <ShieldCheck size={14} className="text-white" /> : <AlertCircle size={14} className="text-white" />}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-display font-black text-slate-900 dark:text-white leading-none tracking-tight uppercase">{log.name}</h4>
                    <div className="flex items-center gap-3 mt-3">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{log.class}</p>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                        <Clock size={12} /> {log.time}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="hidden sm:flex flex-col items-end">
                    <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${log.method === 'face' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                      {log.method === 'face' ? 'Biometric Link' : 'Overridden'}
                    </div>
                    <p className="text-[8px] font-bold text-slate-400 mt-2 uppercase tracking-[0.2em]">Auth Source</p>
                  </div>
                  <ChevronRight size={26} className="text-slate-200 dark:text-slate-800 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>

          <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-slate-200 dark:text-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-800 shadow-inner">
              <History size={40} />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em]">Chronological Brink Reached</p>
              <p className="text-[9px] font-bold text-slate-300 dark:text-slate-700 mt-2 uppercase">End of stream for active cycle</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ArrowLeft: React.FC<{ size: number, className?: string }> = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export default InstitutionalReport;
