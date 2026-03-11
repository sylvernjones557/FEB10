
import React, { useState } from 'react';
import { Lock, User, ChevronRight, Eye, EyeOff, BookOpen, ShieldCheck, Zap } from 'lucide-react';

interface LoginProps {
  onLogin: (username: string, password: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) onLogin(username, password);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col p-6 items-center justify-center school-grid relative transition-colors duration-700">
      {/* Decorative Parallax Background Elements */}
      <div className="absolute top-20 left-10 opacity-5 dark:opacity-10 animate-bounce duration-[4000ms]">
        <BookOpen size={160} className="text-indigo-900 dark:text-indigo-400" />
      </div>
      <div className="absolute bottom-20 right-10 opacity-5 dark:opacity-10 animate-pulse duration-[3000ms]">
        <ShieldCheck size={140} className="text-indigo-900 dark:text-indigo-400" />
      </div>
      <div className="absolute top-1/2 left-1/4 opacity-5 dark:opacity-5 rotate-12">
        <Zap size={200} className="text-amber-500" />
      </div>

      <div className="max-w-sm w-full space-y-10 animate-in fade-in zoom-in-95 duration-1000 relative z-10">
        <div className="flex flex-col items-center text-center gap-5">
          <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-600/30 rotate-6 group transition-all hover:rotate-0 hover:scale-110">
            <BookOpen size={48} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Smart Presence</h1>
            <div className="mt-4 flex items-center justify-center gap-2">
              <ShieldCheck size={14} className="text-indigo-600 dark:text-indigo-400" />
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Institutional Verification</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:shadow-none">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-6">Staff Username</label>
              <div className="relative group">
                <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. j_smith"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[1.75rem] py-5 pl-14 pr-6 text-slate-900 dark:text-white font-semibold text-sm focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-6">Access Code</label>
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[1.75rem] py-5 pl-14 pr-14 text-slate-900 dark:text-white font-semibold text-sm focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 tap-active"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-black py-5 rounded-[1.75rem] transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 tap-active uppercase tracking-widest text-[11px]"
            >
              Authorize Access
              <ChevronRight size={18} strokeWidth={3} />
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 text-slate-300 dark:text-slate-700">
            <div className="h-px w-8 bg-slate-100 dark:bg-slate-800"></div>
            <p className="text-[9px] font-black uppercase tracking-[0.4em]">v4.0.1 Stable</p>
            <div className="h-px w-8 bg-slate-100 dark:bg-slate-800"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
