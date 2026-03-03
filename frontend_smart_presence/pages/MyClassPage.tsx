
import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, CheckCircle2, AlertCircle, Layers } from 'lucide-react';
import { MOCK_CLASSES } from '../constants';
import { data } from '../services/api';

const MyClassPage: React.FC<{ user: any, studentList: any[], groupList?: any[] }> = ({ user, studentList, groupList = MOCK_CLASSES }) => {
  const classObj = groupList.find(c => c.id === user.assignedClassId);
  const classStudents = studentList.filter(s => s.classId === user.assignedClassId);

  // Show proper message if not a class teacher or no class assigned
  if (!user.assignedClassId || !classObj) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 page-enter px-4">
        {/* Decorative icon */}
        <div className="relative">
          <div className="w-32 h-32 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-[2.5rem] flex items-center justify-center shadow-inner border border-slate-200 dark:border-slate-700">
            <Users size={48} className="text-slate-300 dark:text-slate-700" strokeWidth={1.5} />
          </div>
          {/* Floating badge */}
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl flex items-center justify-center shadow-lg">
            <Layers size={18} className="text-slate-400 dark:text-slate-500" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3 max-w-xs">
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            No Group Assigned
          </h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 leading-relaxed">
            You haven't been assigned to a group yet. Please contact the admin to get assigned.
          </p>
        </div>

        {/* Info card */}
        <div className="w-full max-w-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle size={16} className="text-indigo-500 dark:text-indigo-400" />
            </div>
            <div className="text-left">
              <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                How to get assigned
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                Your administrator can assign you to a group from the Settings panel. Once assigned, you'll see your group details here.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Format class label
  const classLabel = classObj.code ? `${classObj.name} (${classObj.code})` : classObj.name;

  // Fetch real attendance data
  const [attendanceRate, setAttendanceRate] = useState<string>('--');
  const [absentCount, setAbsentCount] = useState<number>(0);
  const [attendanceLoaded, setAttendanceLoaded] = useState(false);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const weeklyData = await data.getStaffActivity(user.id);
        if (weeklyData.week && weeklyData.week.length > 0) {
          const totalPresent = weeklyData.week.reduce((sum: number, d: any) => sum + (d.total_present || 0), 0);
          const totalStudents = weeklyData.week.reduce((sum: number, d: any) => sum + (d.total_students || 0), 0);
          const rate = totalStudents > 0 ? (totalPresent / totalStudents * 100).toFixed(1) : '0';
          setAttendanceRate(`${rate}%`);
          // Use latest day's absent count
          const latest = weeklyData.week[weeklyData.week.length - 1];
          setAbsentCount((latest.total_students || 0) - (latest.total_present || 0));
        }
      } catch (e) {
        console.error('Failed to fetch attendance data', e);
      } finally {
        setAttendanceLoaded(true);
      }
    };
    fetchAttendance();
  }, [user.id]);

  return (
    <div className="space-y-8 page-enter">
      <div className="animate-in fade-in slide-in-from-top-4 duration-700">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">My Group</p>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase leading-none mt-1">
          {classLabel}
        </h2>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-[100px] rounded-full"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-500" />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Attendance Status</span>
            </div>
            <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{attendanceRate}</h3>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/40 px-3 py-1 rounded-lg w-fit">{attendanceLoaded ? 'Weekly Average' : 'Loading...'}</p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span className="text-[10px] font-black text-slate-900 dark:text-slate-100">{classStudents.length} ENROLLED</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
              <AlertCircle size={16} className="text-rose-500" />
              <span className="text-[10px] font-black text-slate-900 dark:text-slate-100">{absentCount > 0 ? `${String(absentCount).padStart(2, '0')} ABSENT` : '00 ABSENT'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[12px] font-bold text-slate-900 dark:text-white uppercase tracking-widest px-2">Member List</h3>
        {classStudents.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
            <Users size={32} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500">No members enrolled in this group yet</p>
            <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">Members can be added from the admin Settings panel</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {classStudents.map(student => (
              <div key={student.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 tap-active">
                <img src={student.avatar} className="w-12 h-12 rounded-xl object-cover border-2 border-slate-100 dark:border-slate-800" alt="" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate leading-none">{student.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest">{student.rollNo}</p>
                </div>
                <div className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase ${student.faceDataRegistered ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'}`}>{student.faceDataRegistered ? 'Registered' : 'No Face Data'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyClassPage;
