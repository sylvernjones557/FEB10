
import React, { useState } from 'react';
import { Search, ShieldCheck, ShieldAlert, ChevronRight, UserCircle, X, Activity, TrendingUp, TrendingDown, Clock, Download, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { Student } from '../types';
import { BackButton, MOCK_CLASSES } from '../constants';

interface StudentsDirectoryProps {
  studentList: Student[];
  groupList?: any[];
  onBack: () => void;
  onDeleteStudent?: (studentId: string, studentName: string) => void;
  isAdmin?: boolean;
}

const StudentsDirectory: React.FC<StudentsDirectoryProps> = ({ studentList, groupList = MOCK_CLASSES, onBack, onDeleteStudent, isAdmin = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDegree, setFilterDegree] = useState('All');

  const filtered = studentList.filter(s => {
    const classObj = groupList.find(c => c.id === s.classId);
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.rollNo.includes(searchTerm);
    const isAssigned = Boolean(s.classId);
    const matchesDegree = filterDegree === 'All' || (filterDegree === 'Assigned' ? isAssigned : !isAssigned);
    return matchesSearch && matchesDegree;
  });

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <BackButton onClick={onBack} />
        <div className="text-right">
          <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Member Records</p>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none mt-1">Directory</h2>
        </div>
      </div>
      
      <div className="space-y-5">
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={20} />
          <input 
            type="text" 
            placeholder="Search UID or Name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] pl-14 pr-6 py-5 text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 shadow-sm transition-all"
          />
        </div>
        
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2">
          {['All', 'Assigned', 'Unassigned'].map(degree => (
            <button 
              key={degree}
              onClick={() => setFilterDegree(degree)}
              className={`flex-shrink-0 px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest border transition-all ${
                filterDegree === degree 
                ? 'bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 shadow-xl' 
                : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'
              }`}
            >
              {degree}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map((student) => {
           const classObj = groupList.find(c => c.id === student.classId);
           return (
            <div 
              key={student.id} 
              onClick={() => setSelectedStudent(student)}
              className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm tap-active flex items-center justify-between"
            >
              <div className="flex items-center gap-5 min-w-0">
                <div className="relative shrink-0">
                  <img src={student.avatar} className="w-14 h-14 rounded-2xl object-cover border border-slate-100" alt="" />
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-md ${student.faceDataRegistered ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    {student.faceDataRegistered ? <ShieldCheck size={12} className="text-white" strokeWidth={3} /> : <ShieldAlert size={12} className="text-white" strokeWidth={3} />}
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-none mb-2 truncate">{student.name}</h3>
                  <div className="flex items-center gap-3">
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{student.rollNo}</p>
                     <span className="w-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full"></span>
                     <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">
                       {classObj?.name || 'Unassigned'}
                     </p>
                  </div>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-200 ml-2 shrink-0" />
            </div>
           )
        })}
      </div>

      {selectedStudent && (
        <div className="fixed inset-0 z-[1500] flex items-end justify-center bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white dark:bg-[#0f172a] w-full rounded-t-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-500 border-t border-white/10 safe-bottom">
              
              <div className="p-8 flex justify-between items-start">
                 <div className="relative">
                    <img src={selectedStudent.avatar} className="w-24 h-24 rounded-[2rem] object-cover border-4 border-white dark:border-slate-800 shadow-xl" alt="" />
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-4 border-white dark:border-[#0f172a] bg-emerald-500 flex items-center justify-center shadow-lg">
                       <ShieldCheck size={16} className="text-white" strokeWidth={3} />
                    </div>
                 </div>
                 <button onClick={() => setSelectedStudent(null)} className="w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-2xl tap-active">
                    <X size={24} strokeWidth={3} className="text-slate-500" />
                 </button>
              </div>

              <div className="px-8 space-y-3">
                 <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">{selectedStudent.name}</h3>
                 <div className="flex items-center gap-4">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">UID: {selectedStudent.rollNo}</span>
                    <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                    <span className="text-[11px] font-black text-indigo-500 uppercase tracking-widest">{groupList.find(c => c.id === selectedStudent.classId)?.name || 'Unassigned'}</span>
                 </div>
              </div>

              <div className="p-8 space-y-6">
                 <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-6 rounded-[2rem] space-y-6">
                    <div className="flex items-center justify-between">
                       <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-3">
                          <Activity size={18} className="text-indigo-500" /> Student Info
                       </p>
                       <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
                         selectedStudent.faceDataRegistered 
                           ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                           : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                       }`}>
                         {selectedStudent.faceDataRegistered ? 'Face Registered' : 'No Face Data'}
                       </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm text-center border border-slate-100 dark:border-slate-800">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Roll No</p>
                          <h4 className="text-base font-black text-slate-900 dark:text-white">{selectedStudent.rollNo || '--'}</h4>
                       </div>
                       <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm text-center border border-slate-100 dark:border-slate-800">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Group</p>
                          <h4 className="text-base font-black text-slate-900 dark:text-white">{groupList.find(c => c.id === selectedStudent.classId)?.name || 'Unassigned'}</h4>
                       </div>
                    </div>
                 </div>

                 <button className="w-full py-5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-black rounded-2xl text-[11px] uppercase tracking-widest tap-active flex items-center justify-center gap-3 shadow-xl">
                   Download Profile <Download size={20} strokeWidth={3} />
                 </button>

                 {isAdmin && onDeleteStudent && (
                   <button 
                     onClick={() => {
                       onDeleteStudent(selectedStudent.id, selectedStudent.name);
                       setSelectedStudent(null);
                     }}
                     className="w-full py-5 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest tap-active flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.98]"
                   >
                     <Trash2 size={20} strokeWidth={3} /> Delete Student Permanently
                   </button>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StudentsDirectory;
