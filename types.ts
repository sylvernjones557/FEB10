
export type UserRole = 'ADMIN' | 'STAFF';
export type StaffType = 'CLASS_TEACHER' | 'SUBJECT_TEACHER';

export interface TimetableEntry {
  period: number; // 1, 2, or 3
  subject: string;
  classId: string;
}

export interface DaySchedule {
  day: string;
  periods: TimetableEntry[];
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  username: string;
  password?: string;
  type: StaffType;
  primarySubject: string;
  assignedClassId?: string;
  timetable: DaySchedule[];
  avatar: string;
}

export interface Student {
  id: string;
  name: string;
  rollNo: string;
  classId: string;
  section: string;
  faceDataRegistered: boolean;
  biometricAngles: { front: boolean; left: boolean; right: boolean };
  avatar: string;
}

export interface AuthState {
  user: any | null;
  isAuthenticated: boolean;
}
