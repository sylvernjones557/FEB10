
import React from 'react';
import { ArrowLeft, MessageSquare, Lock, Sparkles, ShieldCheck, Zap } from 'lucide-react';

interface StaffChatProps {
  onBack: () => void;
  targetName?: string;
}

const StaffChat: React.FC<StaffChatProps> = ({ onBack, targetName = "Secure Channel" }) => {
  return (
    <div className="fixed inset-0 bg-[#020617] z-[1000] flex flex-col page-enter overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Header */}
      <header className="px-5 py-6 flex items-center gap-4 relative z-10">
        <button 
          onClick={onBack} 
          className="w-10 h-10 flex items-center justify-center bg-slate-900/50 rounded-xl tap-active text-white border border-slate-800"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h4 className="text-sm font-bold text-white leading-none uppercase tracking-widest">{targetName}</h4>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1.5">Encrypted Protocol</p>
        </div>
      </header>

      {/* Coming Soon Poster Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative z-10">
        <div className="relative mb-12">
          {/* Animated Glow behind the icon */}
          <div className="absolute inset-0 bg-indigo-500 blur-[60px] opacity-20 animate-pulse"></div>
          
          <div className="w-32 h-32 bg-slate-900 rounded-[3rem] border border-slate-800 flex items-center justify-center text-indigo-500 shadow-2xl relative">
            <MessageSquare size={48} strokeWidth={1.5} className="absolute opacity-20 scale-150 rotate-12" />
            <Lock size={40} strokeWidth={2.5} className="relative z-10" />
            
            {/* Small decorative icons */}
            <Sparkles size={16} className="absolute -top-2 -right-2 text-amber-400 animate-bounce" />
            <Zap size={16} className="absolute -bottom-2 -left-2 text-blue-400 animate-pulse" />
          </div>
        </div>

        <div className="max-w-xs space-y-6">
          <div className="space-y-3">
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none italic">
              Coming<br/>Soon
            </h2>
            <div className="h-1 w-12 bg-indigo-600 mx-auto rounded-full"></div>
          </div>
          
          <p className="text-slate-400 text-sm font-medium leading-relaxed">
            We are fine-tuning our encrypted communication protocol to ensure secure peer-to-peer faculty exchange.
          </p>

          <div className="pt-4 flex flex-col gap-3">
             <div className="flex items-center justify-center gap-2 py-3 px-6 bg-slate-900/50 rounded-2xl border border-slate-800">
                <ShieldCheck size={14} className="text-indigo-400" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Next-Gen Security</span>
             </div>
             
             <button 
                onClick={onBack}
                className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-[0.2em] tap-active shadow-xl shadow-white/5"
             >
                Return to Hub
             </button>
          </div>
        </div>
      </div>

      {/* Versioning Footer */}
      <footer className="p-10 text-center relative z-10 opacity-30">
        <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em]">Smart Presence Communications v2.0</p>
      </footer>
    </div>
  );
};

export default StaffChat;
