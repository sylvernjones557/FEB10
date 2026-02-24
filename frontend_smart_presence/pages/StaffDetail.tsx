
import React, { useState, useEffect } from 'react';
import { ArrowUpRight, MessageSquare, ShieldCheck, UserX } from 'lucide-react';
import { StaffMember } from '../types';
import { BackButton } from '../constants';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { data } from '../services/api';

interface StaffDetailProps {
   staff: StaffMember;
   onBack: () => void;
   onOpenChat: (staffId: string) => void;
   onTerminateStaff?: (staffId: string) => void;
   isAdmin?: boolean;
}

const StaffDetail: React.FC<StaffDetailProps> = ({ staff, onBack, onOpenChat, onTerminateStaff, isAdmin }) => {
   const [activityData, setActivityData] = useState<{ day: string, attendance: number }[]>([]);

   useEffect(() => {
      const fetchActivity = async () => {
         try {
            const result = await data.getStaffActivity(staff.id);
            setActivityData(result);
         } catch (e) {
            console.error("Failed to load staff activity", e);
         }
      };
      fetchActivity();
   }, [staff.id]);

   const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

   return (
      <div className="space-y-6 md:space-y-8 pb-10 px-1 page-enter">
         <BackButton onClick={onBack} />

         <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 blur-[100px] rounded-full"></div>

            <div className="relative mb-6">
               <img src={staff.avatar} className="w-28 h-28 md:w-32 md:h-32 rounded-3xl object-cover border-4 border-white dark:border-slate-950 shadow-2xl" alt={staff.name} />
               <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-xl shadow-lg border-2 border-white dark:border-slate-900">
                  <ShieldCheck size={18} strokeWidth={2.5} />
               </div>
            </div>

            <div className="space-y-4 w-full">
               <div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">{staff.name}</h2>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2">Faculty Member Information</p>
               </div>

               <div className="flex flex-wrap justify-center gap-2">
                  {staff.assignedClassId && (
                     <span className="px-5 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[9px] font-bold uppercase tracking-widest border border-indigo-100 dark:border-indigo-800/50">
                        Group: {staff.assignedClassId}
                     </span>
                  )}
                  <span className="px-5 py-2 bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-600 rounded-xl text-[9px] font-bold border border-slate-100 dark:border-slate-800 uppercase tracking-widest">
                     {staff.type.replace('_', ' ')}
                  </span>
                  <span className="px-5 py-2 bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-600 rounded-xl text-[9px] font-bold border border-slate-100 dark:border-slate-800 uppercase tracking-widest">
                     ID: {staff.id.toUpperCase()}
                  </span>
               </div>

               {staff.email && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">{staff.email}</p>
               )}

               <div className="pt-6 flex flex-col sm:flex-row justify-center gap-3">
                  <button
                     onClick={() => onOpenChat(staff.id)}
                     className="w-full sm:w-auto px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex items-center justify-center gap-3 font-bold text-xs uppercase tracking-widest shadow-xl transition-all tap-active"
                  >
                     <MessageSquare size={18} strokeWidth={2.5} />
                     Establish Connection
                  </button>

                  {isAdmin && onTerminateStaff && (
                     <button
                        onClick={() => onTerminateStaff(staff.id)}
                        className="w-full sm:w-auto px-10 py-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded-2xl flex items-center justify-center gap-3 font-bold text-xs uppercase tracking-widest shadow-sm transition-all tap-active"
                     >
                        <UserX size={18} strokeWidth={2.5} />
                        Terminate Staff
                     </button>
                  )}
               </div>
            </div>
         </div>

         <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative">
               <div className="flex items-center justify-between mb-8">
                  <div>
                     <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight uppercase">Presence Insights</h3>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Consistency Over 7 Days</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-xl">
                     <ArrowUpRight size={14} strokeWidth={3} /> +4.2%
                  </div>
               </div>

               <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={activityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        {!isMobile && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.2} />}
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 800 }} />
                        <YAxis hide domain={[0, 100]} />
                        <Tooltip
                           contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '10px', color: '#fff' }}
                           itemStyle={{ padding: 0 }}
                        />
                        <Area
                           type="monotone"
                           dataKey="attendance"
                           stroke="#4F46E5"
                           strokeWidth={isMobile ? 3 : 4}
                           fill="url(#colorPerf)"
                           fillOpacity={1}
                           animationDuration={isMobile ? 500 : 1500}
                        />
                        <defs>
                           <linearGradient id="colorPerf" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                           </linearGradient>
                        </defs>
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>
      </div>
   );
};

export default StaffDetail;
