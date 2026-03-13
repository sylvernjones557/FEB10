
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Radio, CheckCircle2, Clock, Calendar, BookOpen, User, ChevronRight, GraduationCap } from 'lucide-react';
import { StaffMember, Student } from '../types';
import { BackButton } from '../constants';
import { data } from '../services/api';

interface ClassDetailProps {
  classObj: any;
  teacher: StaffMember | null;
  students: Student[];
  isAdmin: boolean;
  onBack: () => void;
  onStaffClick: (id: string) => void;
}

const ClassDetail: React.FC<ClassDetailProps> = ({ classObj, teacher, students, isAdmin, onBack, onStaffClick }) => {
  const [tab, setTab] = useState<'MONITOR' | 'PUPILS'>('MONITOR');
  const [periods, setPeriods] = useState<any[]>([]);

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const result = await data.getClassSchedule(classObj.id);
        setPeriods(result);
      } catch (e) {
        console.error("Failed to load class schedule", e);
      }
    };
    fetchSchedule();
  }, [classObj.id]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between px-1">
        <BackButton onClick={onBack} />
        <div className="text-right">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Group Overview</p>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase mt-1 leading-none">
            {classObj.name}
          </h2>
        </div>
      </div>

      {/* Main Info Card */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 flex flex-col gap-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 bg-indigo-500/5 blur-[100px] rounded-full translate-x-10 -translate-y-10"></div>

        <div className="flex items-center gap-6 z-10">
          <div className="w-20 h-20 rounded-[1.75rem] bg-indigo-600 flex items-center justify-center text-white shadow-2xl rotate-3 shrink-0">
            <h2 className="text-3xl font-black">{classObj.name?.[0] || 'G'}</h2>
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase leading-none">
              {classObj.name}
            </h2>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                <span className="text-[11px] font-bold uppercase tracking-widest">Code {classObj.code || classObj.id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Static Staff Info Card (No Navigation) */}
        <div className="flex items-center gap-5 p-6 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[2.25rem] transition-all z-10">
          <div className="relative">
            <img src={teacher?.avatar || `https://ui-avatars.com/api/?name=Unassigned&background=94A3B8&color=fff&size=64&bold=true`} className="w-16 h-16 rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-md" alt="" />
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-slate-950 shadow-sm ${teacher ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-2 flex items-center gap-1.5">
              <GraduationCap size={14} className="text-indigo-600" />
              Group Lead
            </p>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white truncate leading-none">{teacher?.name || 'Unassigned'}</h4>
            <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">{teacher?.primarySubject || 'No subject'}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-slate-900 p-2 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <button onClick={() => setTab('MONITOR')} className={`flex-1 py-4 rounded-xl text-[11px] font-bold tracking-widest transition-all ${tab === 'MONITOR' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 dark:text-slate-600'}`}>SESSIONS</button>
        <button onClick={() => setTab('PUPILS')} className={`flex-1 py-4 rounded-xl text-[11px] font-bold tracking-widest transition-all ${tab === 'PUPILS' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 dark:text-slate-600'}`}>MEMBERS</button>
      </div>

      {tab === 'MONITOR' ? (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 space-y-8 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                <Calendar size={20} className="text-indigo-600" />
                {todayName} Sessions
              </h3>
            </div>

            <div className="space-y-6 relative">
              <div className="absolute left-8 top-10 bottom-10 w-0.5 bg-slate-100 dark:bg-slate-800 opacity-50"></div>
              {periods.map((p) => (
                <div key={p.id} className="relative flex items-start gap-6 group">
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center z-10 border-2 transition-all shrink-0 mt-1 ${p.status === 'DONE' ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg' :
                      p.status === 'ACTIVE' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg animate-pulse' :
                        'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 shadow-sm'
                    }`}>
                    {p.status === 'DONE' ? <CheckCircle2 size={28} strokeWidth={3} /> : <span className="font-extrabold text-xl">{p.id}</span>}
                  </div>
                  <div className="flex-1 p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 group-hover:bg-white dark:group-hover:bg-slate-900 transition-all shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-base uppercase tracking-tight">{p.label}</h4>
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-600">{p.time}</span>
                    </div>
                    <p className="text-sm font-bold text-indigo-500 leading-none">{p.subject}</p>
                    <p className={`text-[10px] mt-4 font-bold uppercase tracking-[0.2em] px-3 py-1 w-fit rounded-lg ${p.status === 'DONE' ? 'text-emerald-500 bg-emerald-500/10' : p.status === 'ACTIVE' ? 'text-indigo-600 bg-indigo-600/10' : 'text-slate-400 bg-slate-400/10'}`}>
                      {p.status === 'DONE' ? 'Verified' : p.status === 'ACTIVE' ? 'Ongoing' : 'Waiting'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {students.map(student => (
            <div key={student.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.25rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5 tap-active hover:border-indigo-500 transition-all">
              <img src={student.avatar} className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-100 dark:border-slate-800 shadow-sm" alt="" />
              <div className="flex-1 min-w-0">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white truncate leading-none mb-2">{student.name}</h4>
                <div className="flex items-center gap-3">
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">ID: {student.rollNo}</p>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-lg ${student.faceDataRegistered ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-500'}`}>
                    {student.faceDataRegistered ? 'Joined' : 'New'}
                  </span>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-200" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClassDetail;
