
import React, { useState, useEffect } from 'react';
import { AuthState, StaffMember, Student, StaffType, DaySchedule } from './types';
import { MOCK_ADMIN, MOCK_CLASSES } from './constants';
import Layout from './components/Layout';
import { ToastProvider, useToast } from './components/Toast';
import Login from './pages/Login';
import AdminDashboard from './pages/Dashboard';
import ClassDirectory from './pages/ClassDirectory';
import ClassDetail from './pages/ClassDetail';
import ClassAttendance from './pages/ClassAttendance';
import SettingsPage from './pages/Settings';
import StudentsDirectory from './pages/StudentsDirectory';
import StaffDirectory from './pages/StaffDirectory';
import StaffDetail from './pages/StaffDetail';
import InstitutionalReport from './pages/Reports';

// New Staff Pages
import StaffHome from './pages/StaffHome';
import StaffSubjects from './pages/StaffSubjects';
import StaffChat from './pages/StaffChat';
import MyClassPage from './pages/MyClassPage';

import { auth as authApi, data } from './services/api';

// Fetch real timetable from DB for a staff member
const fetchStaffTimetable = async (assignedClassId: string): Promise<DaySchedule[]> => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  try {
    if (!assignedClassId) return days.map(day => ({ day, periods: [] }));
    const entries = await data.getTimetable({ group_id: assignedClassId });
    // Group by day_of_week (1=Monday ... 5=Friday)
    const byDay: Record<number, any[]> = {};
    for (const e of entries) {
      const d = e.day_of_week || 1;
      if (!byDay[d]) byDay[d] = [];
      byDay[d].push(e);
    }
    return days.map((day, i) => {
      const dayEntries = byDay[i + 1] || [];
      return {
        day,
        periods: dayEntries
          .sort((a: any, b: any) => a.period - b.period)
          .map((e: any) => ({
            period: e.period,
            subject: e.subject || 'Free Period',
            teacher: e.staff_name || '',
            time: e.start_time && e.end_time ? `${e.start_time} - ${e.end_time}` : '',
            classId: assignedClassId,
          }))
      };
    });
  } catch {
    return days.map(day => ({ day, periods: [] }));
  }
};

const AppContent: React.FC = () => {
  const toast = useToast();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const [currentPath, setCurrentPath] = useState('/dashboard');
  const [history, setHistory] = useState<string[]>(['/dashboard']);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [attendanceContext, setAttendanceContext] = useState<{ classId: string } | null>(null);

  const [staffList, setStaffList] = useState<StaffMember[]>([]); // Will load from API
  const [studentList, setStudentList] = useState<Student[]>([]); // Will load from API
  const [groupList, setGroupList] = useState<any[]>([]);

  // Load initial session
  useEffect(() => {
    const initSession = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const user = await authApi.me();
          // Transform user to match StaffMember type
          const staffUser: StaffMember & { role: 'ADMIN' | 'STAFF' } = {
            id: user.id,
            name: user.full_name || user.name,
            email: user.email,
            username: user.staff_code,
            type: (user.type || (user.role === 'ADMIN' ? 'CLASS_TEACHER' : 'SUBJECT_TEACHER')) as StaffType,
            assignedClassId: user.assigned_class_id || '',
            avatar: user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.name)}&background=4F46E5&color=fff&size=150&bold=true`,
            primarySubject: user.primary_subject || '',
            timetable: await fetchStaffTimetable(user.assigned_class_id || ''),
            role: user.role
          };

          setAuthState({ user: staffUser, isAuthenticated: true });

          // Load supporting data
          await loadGlobalData();
        } catch (e) {
          console.error("Session expired", e);
          localStorage.removeItem('access_token');
        }
      }
      setIsLoading(false);
    };
    initSession();
  }, []);

  const loadGlobalData = async () => {
    try {
      // Fetch everything in parallel
      const [staffData, groupData, memberData] = await Promise.all([
        data.getStaff(),
        data.getClasses(),
        data.getStudents()
      ]);

      // Transform Staff
      const transformedStaff: StaffMember[] = staffData
        .filter((u: any) => u.role !== 'ADMIN') // Exclude admin from staff list
        .map((u: any) => ({
          id: u.id,
          name: u.full_name || u.name || 'Unknown',
          email: u.email || '',
          username: u.staff_code || '',
          type: (u.type || 'SUBJECT_TEACHER') as StaffType,
          primarySubject: u.primary_subject || 'General',
          assignedClassId: u.assigned_class_id || '',
          avatar: u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || u.name || 'S')}&background=6366F1&color=fff&size=150&bold=true`,
          timetable: [], // Will be loaded on demand
        }));
      setStaffList(transformedStaff);

      // Transform Groups (V2)
      const transformedGroups = (groupData || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        code: g.code || g.id,
      }));
      setGroupList(transformedGroups.length > 0 ? transformedGroups : MOCK_CLASSES);

      // Transform Members (V2)
      const transformedMembers: Student[] = memberData.map((m: any) => ({
        id: m.id,
        name: m.name,
        rollNo: m.roll_no || m.external_id || m.id,
        classId: m.group_id || '',
        section: '',
        faceDataRegistered: m.face_data_registered || false,
        biometricAngles: { front: false, left: false, right: false },
        avatar: m.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name || 'S')}&background=818CF8&color=fff&size=150&bold=true`,
      }));
      setStudentList(transformedMembers);
    } catch (e) {
      console.error("Failed to load global data", e);
    }
  };

  const handleLogin = async (username: string, password: string) => {
    try {
      await authApi.login(username, password);
      const user = await authApi.me();

      const staffUser: StaffMember & { role: 'ADMIN' | 'STAFF' } = {
        id: user.id,
        name: user.full_name || user.name,
        email: user.email,
        username: user.staff_code,
        type: (user.type || (user.role === 'ADMIN' ? 'CLASS_TEACHER' : 'SUBJECT_TEACHER')) as StaffType,
        assignedClassId: user.assigned_class_id || '',
        avatar: user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.name)}&background=4F46E5&color=fff&size=150&bold=true`,
        primarySubject: user.primary_subject || '',
        timetable: await fetchStaffTimetable(user.assigned_class_id || ''),
        role: user.role
      };

      setAuthState({
        user: staffUser,
        isAuthenticated: true
      });

      const targetPath = staffUser.role === 'STAFF' ? '/staff-home' : '/dashboard';
      setCurrentPath(targetPath);
      setHistory([targetPath]);

      await loadGlobalData();

      // Welcome toast
      const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
      const displayName = (user.full_name || user.name || 'User').split(' ')[0];
      toast.showToast(
        'success',
        `${greeting}, ${displayName}! 👋`,
        staffUser.role === 'ADMIN' ? 'Welcome to the Admin Dashboard.' : 'Welcome back to Smart Presence.',
        5000
      );
    } catch (e) {
      toast.showToast('error', 'Login Failed', 'Invalid credentials. Please try again.');
      console.error(e);
    }
  };

  const handleNavigate = (path: string, params?: any) => {
    setHistory(prev => [...prev, path]);
    setCurrentPath(path);
    setSelectedClassId(null);
    setSelectedStaffId(null);
    if (path === '/attendance' && params) {
      setAttendanceContext(params);
    } else if (path !== '/attendance') {
      setAttendanceContext(null);
    }
  };

  const handleBack = () => {
    if (selectedClassId || selectedStaffId) {
      setSelectedClassId(null);
      setSelectedStaffId(null);
      return;
    }
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop();
      const prevPath = newHistory[newHistory.length - 1];
      setCurrentPath(prevPath);
      setHistory(newHistory);
      if (prevPath !== '/attendance') setAttendanceContext(null);
    }
  };

  const renderContent = () => {
    if (!authState.isAuthenticated || isLoading) {
      if (isLoading) return null; // Don't flash login while restoring session
      return <Login onLogin={handleLogin} />;
    }

    if (selectedStaffId) {
      const staff = staffList.find(s => s.id === selectedStaffId);
      if (!staff) {
        setSelectedStaffId(null);
        return <AdminDashboard studentCount={studentList.length} staffCount={staffList.length} onNavigate={handleNavigate} staffList={staffList} groupList={groupList} />;
      }
      return <StaffDetail
        staff={staff}
        onBack={() => setSelectedStaffId(null)}
        onOpenChat={(id) => {
          setSelectedStaffId(null);
          setCurrentPath('/staff-chat');
        }}
        onTerminateStaff={async (staffId: string) => {
          toast.showConfirm(
            'Terminate Staff',
            'Are you sure you want to terminate this staff member? This action cannot be undone.',
            async () => {
              try {
                await data.deleteStaff(staffId);
                toast.showToast('success', 'Staff Terminated', 'The staff member has been removed from the system.');
                setSelectedStaffId(null);
                loadGlobalData();
              } catch (e: any) {
                toast.showToast('error', 'Termination Failed', e.response?.data?.detail || e.message);
              }
            }
          );
        }}
        isAdmin={authState.user?.role === 'ADMIN'}
      />;
    }

    if (selectedClassId) {
      const classObj = (groupList.length ? groupList : MOCK_CLASSES).find(c => c.id === selectedClassId);
      const classTeacher = staffList.find(s => s.assignedClassId === selectedClassId && s.type === 'CLASS_TEACHER');
      const classStudents = studentList.filter(s => s.classId === selectedClassId);
      if (!classObj) {
        setSelectedClassId(null);
        return <AdminDashboard studentCount={studentList.length} staffCount={staffList.length} onNavigate={handleNavigate} staffList={staffList} groupList={groupList} />;
      }
      return <ClassDetail
        classObj={classObj}
        teacher={classTeacher || null}
        students={classStudents}
        isAdmin={authState.user?.role === 'ADMIN'}
        onBack={handleBack}
        onStaffClick={(id) => setSelectedStaffId(id)}
      />;
    }

    switch (currentPath) {
      // Admin Pages
      case '/dashboard': return <AdminDashboard studentCount={studentList.length} staffCount={staffList.length} onNavigate={handleNavigate} staffList={staffList} groupList={groupList} />;
      case '/classes': return <ClassDirectory classList={groupList.length ? groupList : MOCK_CLASSES} staffList={staffList} studentList={studentList} onBack={handleBack} onClassClick={(id) => setSelectedClassId(id)} />;
      case '/students': return <StudentsDirectory 
        studentList={studentList} 
        groupList={groupList.length ? groupList : MOCK_CLASSES} 
        onBack={handleBack}
        isAdmin={authState.user?.role === 'ADMIN'}
        onDeleteStudent={(studentId: string, studentName: string) => {
          toast.showConfirm(
            'Delete Student',
            `Are you sure you want to permanently delete "${studentName}"? This will remove all their data including face registrations and attendance records. This action cannot be undone.`,
            async () => {
              try {
                await data.deleteStudent(studentId);
                toast.showToast('success', 'Student Deleted', `${studentName} has been permanently removed from the system.`);
                loadGlobalData();
              } catch (e: any) {
                toast.showToast('error', 'Deletion Failed', e.response?.data?.detail || e.message);
              }
            }
          );
        }}
      />;
      case '/staff': return <StaffDirectory staffList={staffList} onBack={handleBack} onStaffClick={(id) => setSelectedStaffId(id)} />;
      case '/reports': return <InstitutionalReport onBack={handleBack} />;
      case '/settings': return (
        <SettingsPage
          onBack={handleBack}
          onAddStaff={async (s: any) => {
            try {
              await data.addStaff(s);
              toast.showToast('success', 'Staff Added', `New staff member has been registered successfully.`);
              loadGlobalData();
            } catch (e: any) {
              toast.showToast('error', 'Failed to Add Staff', e.response?.data?.detail || e.message);
            }
          }}
          onAddStudent={async (s: any) => {
            try {
              await data.addStudent(s);
              toast.showToast('success', 'Student Added', 'New student has been enrolled successfully.');
              loadGlobalData();
            } catch (e: any) {
              toast.showToast('error', 'Failed to Add Student', e.response?.data?.detail || e.message);
            }
          }}
          staffList={staffList}
          groupList={groupList.length ? groupList : MOCK_CLASSES}
        />
      );

      // Staff Pages
      case '/staff-home': return <StaffHome user={authState.user} onNavigate={handleNavigate} groupList={groupList.length ? groupList : MOCK_CLASSES} />;
      case '/staff-subjects': return <StaffSubjects user={authState.user} groupList={groupList.length ? groupList : MOCK_CLASSES} studentList={studentList} />;
      case '/staff-chat': return <StaffChat onBack={handleBack} targetName={authState.user?.role === 'ADMIN' ? 'Staff Member' : 'Admin Support'} />;
      case '/my-class': return <MyClassPage user={authState.user} studentList={studentList} groupList={groupList.length ? groupList : MOCK_CLASSES} />;
      case '/attendance': return (
        <ClassAttendance
          isManualDay={false}
          preSelected={attendanceContext}
          studentList={studentList}
          groupList={groupList.length ? groupList : MOCK_CLASSES}
          onExit={handleBack}
        />
      );

      default: {
        const isStaffUser = authState.user?.role === 'STAFF';
        return isStaffUser
          ? <StaffHome user={authState.user} onNavigate={handleNavigate} groupList={groupList.length ? groupList : MOCK_CLASSES} />
          : <AdminDashboard studentCount={studentList.length} staffCount={staffList.length} onNavigate={handleNavigate} staffList={staffList} groupList={groupList} />;
      }
    }
  };

  return (
    <Layout
      user={authState.user}
      onLogout={() => { authApi.logout(); setAuthState({ user: null, isAuthenticated: false }); toast.showToast('info', 'Logged Out', 'You have been signed out successfully.'); }}
      activePath={currentPath}
      onNavigate={handleNavigate}
    >
      {renderContent()}
    </Layout>
  );
};

// Wrap with ToastProvider so useToast works
const App: React.FC = () => (
  <ToastProvider>
    <AppContent />
  </ToastProvider>
);

export default App;
