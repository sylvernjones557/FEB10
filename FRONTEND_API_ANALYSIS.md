# Frontend API Analysis & Integration Plan

This document details the API requirements extracted from the frontend code analysis. The frontend currently uses mock data (`MOCK_CLASSES`, local arrays) which must be replaced with the following backend endpoints.

## 1. Authentication (`Login.tsx`, `App.tsx`)
**Current Logic:** Checks username string inclusion (mock).
**Required Integration:**
- **Endpoint:** `POST /api/v1/login/access-token`
- **Request Body:** `FormData { username, password }`
- **Response:** `{ access_token, token_type }`
- **Action:** Store token in localStorage/Context, fetch user profile.

## 2. Global State & User Profile (`App.tsx`)
**Current Logic:** Hardcoded `staffList`, `studentList`.
**Required Integration:**
- **Endpoint:** `GET /api/v1/users/me` (Get current logged-in user)
- **Endpoint:** `GET /api/v1/groups/` (Replace `MOCK_CLASSES`)
- **Endpoint:** `GET /api/v1/members/` (Load all members for Admin view)
- **Endpoint:** `GET /api/v1/users/` (Load all staff for Admin view)

## 3. Operations Dashboard (`Dashboard.tsx`)
**Current Logic:** Displays lengths of local arrays.
**Required Integration:**
- Use data from Global State (above) to populate counters.
- **Endpoint:** `GET /api/v1/attendance/stats` (New endpoint recommended/calculated frontend) for "Active" and "Verified" stats.

## 4. Attendance & Face Recognition (`ClassAttendance.tsx`, `FaceScanner.tsx`)
**Current Logic:** `FaceScanner` emits random usage. `ClassAttendance` tracks local state.
**Required Integration:**
- **WebSocket:** `ws://.../api/v1/attendance/ws`
    - **Purpose:** Receive real-time "SCANNING", "VERIFYING", "COMPLETED" states and live student counts.
- **Endpoint:** `POST /api/v1/attendance/start`
    - **Body:** `{ group_id }`
- **Endpoint:** `POST /api/v1/recognition/recognize`
    - **Action:** `FaceScanner.tsx` must capture video frame (canvas.toBlob) -> Send `Multipart/Form-Data` -> Backend returns Identified Student IDs.
- **Endpoint:** `POST /api/v1/attendance/finalize`
    - **Action:** Submits the final list of present/absent members.

## 5. Registration Settings (`Settings.tsx`)
**Current Logic:** Updates local arrays. `scanProgress` is a `setInterval` simulation.
**Required Integration:**
- **Endpoint:** `POST /api/v1/users/` (Add Teacher)
- **Endpoint:** `POST /api/v1/members/` (Add Member Data)
- **Endpoint:** `POST /api/v1/recognition/register-face`
    - **Action:** The "Face Scan" UI must capture 3 images (Front, Left, Right) and upload them.
    - **Body:** `Multipart/Form-Data` with `file` and `member_id`.

## 6. Directories (`StudentsDirectory.tsx`, `StaffDirectory.tsx`)
**Required Integration:**
- Populate lists using the data fetched in Global State.
- **Endpoint:** `DELETE /api/v1/members/{id}`
- **Endpoint:** `DELETE /api/v1/users/{id}`

## 7. Analytics & Visualizations (`Reports.tsx`, `StaffDetail.tsx`)
**Current Logic:** Hardcoded arrays (`performanceData`) and static numbers (e.g., "99.4%").
**Required Backend Enhancements:**
- **Endpoint:** `GET /api/v1/stats/institutional`
    - **Returns:** `{ presence_index: 99.4, net_increase: 4.2, total_enrollment: 184, avg_latency: 0.42, daily_success: 98.5 }`
    - **Logic:** Aggregates total students, today's attendance rate vs. yesterday.
- **Endpoint:** `GET /api/v1/attendance/history/weekly/{staff_id}`
    - **Returns:** `[{ day: 'Mon', attendance: 92 }, ...]` (Last 7 days average attendance for classes taught by this staff member).
- **Endpoint:** `GET /api/v1/groups/{id}/members`
    - **Returns:** List of members for a group.

## Recommended Architecture Change
1.  **Centralised API Service (`src/services/api.ts`)**:
    -   Create a singleton `axios` instance.
    -   **Interceptor:** Automatically attach `Authorization: Bearer <token>` from `localStorage`.
    -   **Error Handling:** Global handler to redirect to `/login` on 401 Unauthorized.
2.  **React Query / SWR (Optional but Recommended)**:
    -   Use `useQuery` hooks for fetching data like `studentList`, `staffList`, and analytics to handle caching and loading states automatically.
3.  **Context API Refactor**:
    -   Move `auth` state to a dedicated `AuthContext`.
    -   Move global data (`students`, `classes`) to a `DataContext` to avoid prop drilling.
