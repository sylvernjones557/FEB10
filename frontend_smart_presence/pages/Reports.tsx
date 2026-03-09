
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
  AlertCircle
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
    <div className="space-y-8 page-enter font-main">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <BackButton onClick={onBack} />
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTabChange('analytics')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'analytics' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 dark:bg-slate-900 text-slate-400'}`}
            >
              Analytics
            </button>
            <button
              onClick={() => handleTabChange('history')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 dark:bg-slate-900 text-slate-400'}`}
            >
              Live Logs
            </button>
          </div>
        </div>

        <div className="text-left">
          <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mb-2">Operational Intelligence</p>
          <h2 className="text-4xl font-display font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">
            {activeTab === 'analytics' ? 'Executive Report' : 'Attendance Stream'}
          </h2>
        </div>
      </div>

      {activeTab === 'analytics' ? (
        <div className="space-y-6">
          {/* Main Hero Card */}
          <div className="glass-card p-8 rounded-[3rem] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full translate-x-20 -translate-y-20 group-hover:bg-indigo-500/20 transition-all duration-700"></div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-600/40 transform -rotate-3 group-hover:rotate-0 transition-transform duration-500">
                  <Globe size={40} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white leading-none">Global Accuracy</h3>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                      System Health: <span className="text-emerald-500">Excellent ({stats.presence_index}%)</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center md:items-end">
                <div className="text-4xl font-display font-black text-emerald-500 tracking-tighter flex items-center gap-2">
                  +{stats.net_increase}% <TrendingUp size={32} />
                </div>
                <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] mt-2">Dossier Growth Index</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 relative z-10">
              {[
                { label: 'Verified Enrollment', value: stats.total_enrollment, sub: 'Total Souls', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-500/5' },
                { label: 'Network Latency', value: `${stats.avg_latency}s`, sub: 'Real-time Sync', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/5' },
                { label: 'Recognition Rate', value: `${stats.daily_success}%`, sub: 'Peak Efficacy', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/5' }
              ].map((stat) => (
                <div key={stat.label} className={`p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800/50 flex flex-col gap-4 bg-white/40 dark:bg-slate-900/40 hover:scale-[1.02] transition-all`}>
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                      <stat.icon size={20} strokeWidth={2.5} />
                    </div>
                    <ArrowUpRight size={16} className="text-slate-300 dark:text-slate-700" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{stat.label}</p>
                    <p className="text-2xl font-display font-black text-slate-900 dark:text-white mt-1 tabular-nums">{stat.value}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-1 opacity-60 uppercase tracking-widest">{stat.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => haptics.impactMedium()} className="w-full mt-10 py-5 bg-indigo-600 text-white font-display font-black rounded-2xl text-[12px] uppercase tracking-[0.3em] shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 tap-active hover:bg-indigo-700 transition-all saturate-[1.2]">
              <Download size={20} /> Generate Intelligence Dossier
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Search dossiers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-16 bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] pl-14 pr-6 text-slate-900 dark:text-white font-bold text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
              />
            </div>
            <button className="h-16 px-8 bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] flex items-center gap-3 text-slate-400 font-black text-[10px] uppercase tracking-widest tap-active hover:text-indigo-500">
              <Filter size={18} /> Filters
            </button>
          </div>

          {/* Timeline View */}
          <div className="space-y-4">
            {attendanceLog.map((log, idx) => (
              <div
                key={log.id}
                className="glass-card p-6 rounded-[2rem] flex items-center justify-between group hover:scale-[1.01] active:scale-[0.99]"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(log.name)}&background=random&color=fff&bold=true`} alt={log.name} className="w-full h-full object-cover" />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white dark:border-slate-950 flex items-center justify-center ${log.status === 'verified' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                      {log.status === 'verified' ? <ShieldCheck size={12} className="text-white" /> : <AlertCircle size={12} className="text-white" />}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-base font-display font-black text-slate-900 dark:text-white leading-tight">{log.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 flex items-center gap-2">
                      {log.class} • <Clock size={12} /> {log.time}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${log.method === 'face' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                      {log.method === 'face' ? 'Biometric' : 'Manual Entry'}
                    </span>
                    <p className="text-[8px] font-bold text-slate-400 dark:text-slate-600 mt-1 uppercase">Methodology</p>
                  </div>
                  <ChevronRight size={20} className="text-slate-300 dark:text-slate-700 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/40 p-10 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
              <Calendar size={28} className="text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-display font-black text-slate-400 uppercase tracking-widest">End of Daily Dossier</p>
              <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 mt-1">Only displaying logs for March 09, 2026</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstitutionalReport;
