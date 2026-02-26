
import React, { useState } from 'react';
import { Layers, Users, ChevronRight, CheckCircle2, Radio, UserCircle, Layout } from 'lucide-react';
import { BackButton } from '../constants';
import { StaffMember, Student } from '../types';

interface ClassDirectoryProps {
  classList: any[];
  staffList: StaffMember[];
  studentList: Student[];
  onBack: () => void;
  onClassClick: (id: string) => void;
}

const ClassDirectory: React.FC<ClassDirectoryProps> = ({ classList, staffList, studentList, onBack, onClassClick }) => {
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Archived'>('All');

  const filteredClasses = classList.filter(c => {
    if (statusFilter === 'All') return true;
    const isActive = c.is_active !== false;
    return statusFilter === 'Active' ? isActive : !isActive;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <BackButton onClick={onBack} />
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Group Directory</p>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none mt-1">Classes</h2>
        </div>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2">
        {['All', 'Active', 'Archived'].map(type => (
          <button 
            key={type}
            onClick={() => setStatusFilter(type as any)}
            className={`flex-shrink-0 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
              statusFilter === type 
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-600/20' 
              : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredClasses.map((cls) => {
          const teacher = staffList.find(s => s.assignedClassId === cls.id);
          const studentsCount = studentList.filter(s => s.classId === cls.id).length;
          
          return (
            <div 
              key={cls.id} 
              onClick={() => onClassClick(cls.id)}
              className="group relative bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all duration-500 tap-active cursor-pointer overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center transition-all group-hover:bg-indigo-600 group-hover:text-white shadow-sm">
                  <Layout size={32} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col items-end gap-2">
                  {cls.is_active !== false ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-500 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                      <CheckCircle2 size={14} strokeWidth={3} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Active</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 rounded-xl border border-amber-100 dark:border-amber-800/50">
                      <Radio size={14} className="animate-pulse" strokeWidth={3} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Archived</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-4 relative z-10">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">{cls.name}</h3>
                  <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-2">Code: {cls.code || cls.id}</p>
                </div>
                
                <div className="flex gap-2.5 pt-4">
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800"></div>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 group-hover:bg-white dark:group-hover:bg-slate-900 transition-all relative z-10">
                 <img src={teacher?.avatar} className="w-12 h-12 rounded-xl object-cover border-2 border-white dark:border-slate-800 shadow-sm" alt="" />
                 <div className="min-w-0">
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1.5">Staff In-Charge</p>
                    <p className="text-sm font-black text-slate-900 dark:text-slate-200 truncate">{teacher?.name}</p>
                 </div>
              </div>

              <div className="mt-6 flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800 relative z-10">
                 <div className="flex items-center gap-2">
                    <Users size={18} className="text-indigo-600 dark:text-indigo-400" strokeWidth={2.5} />
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{studentsCount} Candidates</span>
                 </div>
                 <ChevronRight size={20} className="text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClassDirectory;
