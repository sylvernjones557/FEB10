import axios from 'axios';

// Base URL configuration (Vite environment variable or default)
// For Ngrok/PWA: Relative paths ensure the frontend talks to the same host it was loaded from.
const API_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add the access token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle token expiry
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Clear token and redirect to login if unauthorized
            localStorage.removeItem('access_token');
            // Ideally, trigger a logout action in the app state
            window.location.href = '/'; // Simple redirect for now
        }
        return Promise.reject(error);
    }
);

export const auth = {
    login: async (username: string, password: string) => {
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('password', password);
        const response = await api.post('/login/access-token', params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        if (response.data.access_token) {
            localStorage.setItem('access_token', response.data.access_token);
        }
        return response.data;
    },
    me: async () => {
        const response = await api.get('/staff/me');
        return response.data;
    },
    logout: () => {
        localStorage.removeItem('access_token');
    }
};

export const data = {
    getStats: async () => {
        const response = await api.get('/stats/institutional');
        return response.data;
    },
    getLiveClasses: async () => {
        const response = await api.get('/classes/live');
        return response.data;
    },
    getStaffActivity: async (staffId: string) => {
        const response = await api.get(`/attendance/history/weekly/${staffId}`);
        return response.data;
    },
    getClassSchedule: async (classId: string) => {
        const response = await api.get(`/classes/${classId}/schedule/today`);
        return response.data;
    },
    getStaff: async () => {
        const response = await api.get('/staff/');
        return response.data;
    },
    getStudents: async () => {
        const response = await api.get('/students/');
        return response.data;
    },
    getClasses: async () => {
        const response = await api.get('/groups/');
        return response.data;
    },
    getGroups: async () => {
        const response = await api.get('/groups/');
        return response.data;
    },
    getMembers: async (params?: { group_id?: string; role?: string }) => {
        const response = await api.get('/students/', { params });
        return response.data;
    },
    addStaff: async (staffBody: any) => {
        // Requires ADMIN token — transform frontend fields to backend schema
        const payload = {
            name: staffBody.full_name || staffBody.name,
            full_name: staffBody.full_name || staffBody.name,
            staff_code: staffBody.staff_code,
            password: staffBody.password,
            email: staffBody.email,
            role: staffBody.role || 'STAFF',
            type: staffBody.type || 'SUBJECT_TEACHER',
            primary_subject: staffBody.primary_subject,
            assigned_class_id: staffBody.assigned_class_id || null,
            avatar_url: staffBody.avatar_url,
        };
        const response = await api.post('/staff/', payload);
        return response.data;
    },
    addStudent: async (studentBody: any) => {
        // Requires ADMIN token — transform frontend fields to backend schema
        const payload = {
            name: studentBody.name,
            group_id: studentBody.group_id,
            roll_no: studentBody.external_id || studentBody.id || studentBody.roll_no,
            external_id: studentBody.external_id || studentBody.id,
            email: studentBody.email,
            avatar_url: studentBody.avatar_url,
        };
        const response = await api.post('/students/', payload);
        return response.data;
    },
    deleteStaff: async (staffId: string) => {
        // Requires ADMIN token — deletes staff by UUID id
        const response = await api.delete(`/staff/${staffId}`);
        return response.data;
    },
    deleteStudent: async (studentId: string) => {
        // Requires ADMIN token — deletes student by UUID id (also cleans face data + attendance records)
        const response = await api.delete(`/students/${studentId}`);
        return response.data;
    },
    updateStaff: async (staffId: string, updateBody: any) => {
        // PATCH staff profile — admin can update anyone, staff can update self
        const response = await api.patch(`/staff/${staffId}`, updateBody);
        return response.data;
    },
    getTimetable: async (params?: { staff_id?: string; group_id?: string; day_of_week?: number }) => {
        const response = await api.get('/timetable/', { params });
        return response.data;
    },
    addTimetableEntry: async (entry: { group_id: string; staff_id?: string; day_of_week: number; period: number; subject: string; start_time?: string; end_time?: string }) => {
        const response = await api.post('/timetable/', entry);
        return response.data;
    },
    getClassScheduleToday: async (classId: string) => {
        const response = await api.get(`/classes/${classId}/schedule/today`);
        return response.data;
    }
};

// ── Face Recognition & Registration ──

export const recognition = {
    /**
     * Register a face for a student (admin only).
     * Sends a captured image frame to the backend.
     */
    registerFace: async (studentId: string, imageBlob: Blob): Promise<{ message: string; student_id: string }> => {
        const formData = new FormData();
        formData.append('student_id', studentId);
        formData.append('file', imageBlob, 'face.jpg');
        const response = await api.post('/recognition/register-face', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    /**
     * Recognize faces in a captured frame.
     * Returns match results with student IDs and confidence.
     */
    recognizeFace: async (imageBlob: Blob): Promise<{
        match: boolean;
        matches: Array<{ student_id: string; distance: number; metadata: any; bbox?: number[] }>;
        unrecognized?: Array<{ bbox: number[] }>;
        frame_size?: number[];
        detail?: string;
    }> => {
        const formData = new FormData();
        formData.append('file', imageBlob, 'frame.jpg');
        const response = await api.post('/recognition/recognize', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
};

// ── Attendance Session Management ──

export const attendance = {
    /** Start an attendance scanning session */
    startSession: async (groupId: string) => {
        const response = await api.post('/attendance/start', { group_id: groupId });
        return response.data;
    },

    /** Get current session status */
    getStatus: async () => {
        const response = await api.get('/attendance/status');
        return response.data;
    },

    /** Stop scanning (move to VERIFYING state) */
    stopScanning: async () => {
        const response = await api.post('/attendance/stop');
        return response.data;
    },

    /** Submit manual adjustments before finalizing */
    verify: async (manualPresent: string[] = [], manualAbsent: string[] = []) => {
        const response = await api.post('/attendance/verify', {
            manual_present: manualPresent,
            manual_absent: manualAbsent,
        });
        return response.data;
    },

    /** Finalize session and persist to DB */
    finalize: async () => {
        const response = await api.post('/attendance/finalize');
        return response.data;
    },
};

export default api;
