
import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, MoreVertical, Plus, Mic, CheckCheck, ArrowLeft, Search } from 'lucide-react';
import { StaffMember } from '../types';

interface GlobalChatProps {
  onBack: () => void;
  staffList: StaffMember[];
}

const GlobalChat: React.FC<GlobalChatProps> = ({ onBack, staffList }) => {
  const [messages, setMessages] = useState([
    { id: 1, user: 'Mrs. James Miller', text: 'Good morning. Grade 1-A node is fully verified and synced with the central registry.', time: '09:15', self: false, status: 'read', avatar: 'https://ui-avatars.com/api/?name=James+Miller&background=6366F1&color=fff&size=150&bold=true' },
    { id: 2, user: 'Me', text: 'Excellent. Monitor hallway sensors during recess cycle.', time: '09:20', self: true, status: 'read' },
    { id: 3, user: 'Mr. Robert Chen', text: 'Hallway 4 re-calibrated for high traffic.', time: '10:05', self: false, status: 'read', avatar: 'https://ui-avatars.com/api/?name=Robert+Chen&background=818CF8&color=fff&size=150&bold=true' },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const onSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const newMessage = {
      id: Date.now(),
      user: 'Me',
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      self: true,
      status: 'sent' as const
    };
    setMessages([...messages, newMessage]);
    setInput('');

    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, status: 'read' as const } : m));
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-[#F2F4F7] dark:bg-[#0b141a] z-[3000] flex flex-col animate-in fade-in duration-300 overflow-hidden">
      {/* Immersive Mobile Header */}
      <header className="h-16 flex-shrink-0 bg-white dark:bg-[#202c33] border-b border-slate-200 dark:border-slate-800 flex items-center px-2 gap-1 z-50">
        <button
          onClick={onBack}
          className="p-3 text-slate-500 hover:text-indigo-600 tap-active"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="flex-1 flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm">
            <MessageSquare size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate tracking-tight leading-none">FACULTY FEED</h3>
            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-1">
              {staffList.length} ONLINE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <button className="p-2.5 text-slate-400"><Search size={20} /></button>
          <button className="p-2.5 text-slate-400"><MoreVertical size={20} /></button>
        </div>
      </header>

      {/* Message Area with Smooth Scroll */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-5 space-y-4 no-scrollbar"
      >
        <div className="flex justify-center mb-6">
          <span className="px-2.5 py-1 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm text-slate-500 text-[9px] font-black rounded-md uppercase tracking-widest border border-slate-100 dark:border-slate-800">
            Today
          </span>
        </div>

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.self ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-1 duration-200`}>
            {!m.self && m.avatar && (
              <img src={m.avatar} className="w-8 h-8 rounded-full mr-2 self-end mb-1 shadow-sm border border-white" alt="" />
            )}
            <div
              className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl relative shadow-sm ${m.self
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-100 dark:border-slate-800'
                }`}
            >
              {!m.self && (
                <p className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 mb-1 uppercase">
                  {m.user}
                </p>
              )}
              <p className="text-[14px] leading-relaxed break-words font-medium">{m.text}</p>
              <div className={`flex items-center justify-end gap-1.5 mt-1 ${m.self ? 'text-indigo-100/70' : 'text-slate-400'}`}>
                <span className="text-[9px] font-bold">{m.time}</span>
                {m.self && (
                  <CheckCheck size={14} className={m.status === 'read' ? 'text-emerald-300' : 'opacity-40'} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky Mobile Input Console */}
      <div className="bg-white dark:bg-[#202c33] px-3 py-3 pb-8 flex items-center gap-2 border-t border-slate-200 dark:border-slate-800 safe-bottom">
        <button className="p-2 text-slate-400 hover:text-indigo-600 tap-active"><Plus size={24} /></button>

        <form onSubmit={onSend} className="flex-1 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl px-4 py-3 text-sm focus:outline-none border border-transparent placeholder-slate-400 transition-all"
            placeholder="Type your message..."
          />

          <button
            type="submit"
            className={`w-11 h-11 flex-shrink-0 rounded-2xl flex items-center justify-center shadow-lg transition-transform tap-active ${input.trim() ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
          >
            {input.trim() ? <Send size={18} fill="currentColor" /> : <Mic size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GlobalChat;