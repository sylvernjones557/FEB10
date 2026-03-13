
import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Users,
  Settings,
  ArrowLeft,
  Calendar,
  GraduationCap,
  MessageSquare,
  BookOpen
} from 'lucide-react';

export const COLORS = {
  primary: '#4F46E5',
  secondary: '#64748B',
  accent: '#818CF8',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
};

export const MOCK_ADMIN: any = {
  id: 'adm-001',
  name: 'Dept Head - Sarah Wilson',
  email: 'hod@college.edu',
  role: 'ADMIN',
  avatar: 'https://ui-avatars.com/api/?name=Admin&background=4F46E5&color=fff&size=150&bold=true'
};

export const MOCK_CLASSES = [
  { id: 'g1', name: 'Class A', code: 'A' },
  { id: 'g2', name: 'Class B', code: 'B' },
  { id: 'g3', name: 'Batch 1', code: 'B1' },
  { id: 'g4', name: 'Batch 2', code: 'B2' },
];

/**
 * Check if a class/group is the special "Test Class".
 * Test Class bypasses timetable logic and shows ALL registered students.
 */
export const isTestClass = (cls: { name?: string; code?: string; id?: string } | null | undefined): boolean => {
  if (!cls) return false;
  const name = (cls.name || '').toLowerCase();
  const code = (cls.code || '').toLowerCase();
  return name.includes('test') || code === 'test' || code === 'tst';
};

export const NAV_ITEMS = {
  ADMIN: [
    { label: 'Home', icon: <LayoutDashboard size={24} />, path: '/dashboard' },
    { label: 'Classes', icon: <Layers size={24} />, path: '/classes' },
    { label: 'Staff', icon: <GraduationCap size={24} />, path: '/staff' },
    { label: 'Settings', icon: <Settings size={24} />, path: '/settings' },
  ],
  STAFF: [
    { label: 'Home', icon: <LayoutDashboard size={24} />, path: '/staff-home' },
    { label: 'Groups', icon: <BookOpen size={24} />, path: '/staff-subjects' },
    { label: 'My Group', icon: <Users size={24} />, path: '/my-class' },
    { label: 'Chat', icon: <MessageSquare size={24} />, path: '/staff-chat' },
  ]
};

export const BackButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className="flex items-center gap-3 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors py-3 px-1 mb-4 group tap-active"
  >
    <div className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl group-hover:border-indigo-500 transition-all shadow-sm">
      <ArrowLeft size={18} />
    </div>
    <span className="text-sm font-bold uppercase tracking-widest">Back</span>
  </button>
);
