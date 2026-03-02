
import React from 'react';
import { PlayCircle, MapPin, CalendarDays, Layers, Users, Sparkles } from 'lucide-react';
import { QuickAction, SummaryCard } from './Dashboard';
import { isTestClass } from '../constants';

interface StaffHomeProps {
  user: any;
  onNavigate: (path: string, params?: any) => void;
  groupList?: any[];
}

const StaffHome: React.FC<StaffHomeProps> = ({ user, onNavigate, groupList = [] }) => {
  const now = new Date();
  const hours = now.getHours();
  const today = now.toLocaleDateString('en-US', { weekday: 'long' });
  const todayDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  const assignedGroupId = user?.assignedClassId || '';
  const assignedGroup = groupList.find((g: any) => g.id === assignedGroupId);
  const groupDisplayName = assignedGroup ? assignedGroup.name : (assignedGroupId || 'Unassigned');
  const isReady = Boolean(assignedGroupId);
  const isTest = isTestClass(assignedGroup);

  const handleStartAttendance = () => {
    if (isReady) {
      onNavigate('/attendance', { classId: assignedGroupId });
    }
  };

  return (
    <div className="space-y-8 page-enter">
      {/* Dynamic Hero Banner */}
      <div 
        onClick={handleStartAttendance}
        className={`p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden transition-all duration-500 ${
          isReady 
          ? 'bg-indigo-600 tap-active group cursor-pointer shadow-indigo-500/30' 
          : 'bg-slate-900 dark:bg-slate-900 border border-slate-800 cursor-default opacity-90'
        }`}
      >
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 blur-3xl rounded-full"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-5">
            <span className={`flex h-2.5 w-2.5 rounded-full ${isReady ? 'bg-emerald-400 animate-pulse shadow-[0_0_12px_#34d399]' : 'bg-slate-600'}`}></span>
            <p className="text-white/70 text-[12px] font-bold uppercase tracking-widest">
              {isTest ? 'Test Mode • All Students' : isReady ? 'Ready for Session' : 'No Group Assigned'}
            </p>
          </div>
          
          <h2 className="text-3xl font-black tracking-tight leading-none uppercase mb-8">
            {isReady ? 'Start Attendance' : 'Awaiting Assignment'}
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 px-5 py-4 rounded-2xl border border-white/5 backdrop-blur-md">
               <p className="text-[10px] font-bold uppercase text-white/50 tracking-wider mb-1 flex items-center gap-2">
                 <CalendarDays size={14} /> {todayDate}
               </p>
               <p className="font-bold text-base tracking-tight">{today}</p>
            </div>
              <div className="bg-white/10 px-5 py-4 rounded-2xl border border-white/5 backdrop-blur-md">
               <p className="text-[10px] font-bold uppercase text-white/50 tracking-wider mb-1 flex items-center gap-2">
                 <MapPin size={14} /> Group
               </p>
               <p className="font-bold text-base tracking-tight">{groupDisplayName}</p>
            </div>
          </div>

          {isReady && (
            <button className="w-full mt-6 py-4 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl group-hover:scale-[1.02] transition-transform">
              Begin Face Scanning <PlayCircle size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SummaryCard title="Groups" value={isReady ? 1 : 0} color="bg-indigo-600" />
        <SummaryCard title="Status" value={isReady ? 'Ready' : 'Unassigned'} color="bg-emerald-600" />
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
        <h3 className="text-[12px] font-bold text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-3 mb-6">
          Session Console
        </h3>

        <div className="space-y-4">
          {isReady ? (
            <div 
              onClick={handleStartAttendance}
              className="flex items-center justify-between p-6 border rounded-3xl transition-all bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 tap-active cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base border bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900 dark:text-white">Start Attendance</p>
                  <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-widest">
                    {groupDisplayName}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No group assigned</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <QuickAction label="Academic Feed" icon={Layers} color="bg-blue-600" onClick={() => onNavigate('/staff-subjects')} />
        <QuickAction label="Messages" icon={Users} color="bg-emerald-600" onClick={() => onNavigate('/staff-chat')} />
      </div>
    </div>
  );
};

export default StaffHome;
