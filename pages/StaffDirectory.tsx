
import React from 'react';
import { Mail, Briefcase, Star, ChevronRight, GraduationCap } from 'lucide-react';
import { StaffMember } from '../types';
import { BackButton } from '../constants';

interface StaffDirectoryProps {
  staffList: StaffMember[];
  onBack: () => void;
  onStaffClick: (id: string) => void;
}

const StaffDirectory: React.FC<StaffDirectoryProps> = ({ staffList, onBack, onStaffClick }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <BackButton onClick={onBack} />
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Staff Records</p>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none mt-1">Faculty List</h2>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {staffList.map((staff) => (
          <div 
            key={staff.id} 
            onClick={() => onStaffClick(staff.id)}
            className="group relative bg-white dark:bg-slate-900 p-7 rounded-[2.8rem] border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-2xl dark:hover:shadow-indigo-500/5 transition-all duration-500 flex flex-col cursor-pointer tap-active overflow-hidden"
          >
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-50 dark:bg-indigo-900/10 opacity-0 group-hover:opacity-100 blur-[80px] rounded-full transition-opacity duration-700"></div>
            
            <div className="flex items-center gap-6 mb-8 relative z-10">
              <div className="relative shrink-0">
                <img src={staff.avatar} className="w-20 h-20 rounded-[1.8rem] object-cover border-4 border-white dark:border-slate-800 shadow-xl transition-transform duration-500 group-hover:scale-105" alt={staff.name} />
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-lg">
                   <Star size={10} className="text-white fill-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-2">
                   Staff Directory
                 </p>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 transition-colors truncate">{staff.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2 flex items-center gap-2">
                   <Briefcase size={12} className="text-indigo-500" />
                   {staff.type.replace('_', ' ')}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
               <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl transition-colors group-hover:bg-white dark:group-hover:bg-slate-900">
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1.5">Role</p>
                  <p className="text-xs font-black text-slate-900 dark:text-slate-200 truncate">{staff.type.replace('_', ' ')}</p>
               </div>
               <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl transition-colors group-hover:bg-white dark:group-hover:bg-slate-900">
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1.5">Status</p>
                  <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase">{staff.assignedClassId ? 'Assigned' : 'Available'}</p>
               </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800/50 relative z-10">
               <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 transition-colors">
                  <Mail size={18} strokeWidth={2.5} />
                  <span className="text-[10px] font-bold tracking-tight lowercase">{staff.email}</span>
               </div>
               <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-500 font-black text-[10px] uppercase tracking-widest group-hover:translate-x-1 transition-all">
                  View Profile <ChevronRight size={16} strokeWidth={3} />
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StaffDirectory;
