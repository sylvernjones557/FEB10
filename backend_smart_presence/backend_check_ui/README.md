
# Backend Check UI - Functional Verification Dashboard

This is a standalone, lightweight HTML/JS interface designed to verify the **Smart Presence Backend** logic. It now **fully replicates the core logic** of the planned frontend while exposing **100% of the backend features**, including administrative tools.

## 🚀 Prerequisites

1.  **Backend Running**:
    ```bash
    cd e:\FEB10\backend_smart_presence
    .\venv\Scripts\activate
    uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
    ```

## 🖥️ Replicated Flow (Staff Portal)

1.  **Login Screen**:
    - Hits `POST /api/v1/login/access-token`.
    - Credentials: `stf-1` / `password123`.

2.  **Dashboard (Staff Home)**:
    - **Dynamic Logic**: Shows assigned group and session readiness.
    - **Live Session**: Starts attendance directly for the assigned group.

3.  **Attendance Session**:
    - **Start**: Auto-starts backend session (`POST /start`).
    - **Roster**: Fetches members (`GET /members`) and filters by group.
    - **Real-time**: WebSocket connection updates presence instantly.
    - **Face Recognition**: Upload a file to `POST /recognize`. If it matches, the avatar turns green.
    - **Manual Mode**: Click any avatar to toggle presence (`POST /verify`).

## 🛠️ Admin Tools (New)

Access via the **"Admin / Registration Tools"** button on the dashboard.

1.  **Create Member (`POST /members`)**: Add new member IDs to the system.
2.  **Register Face (`POST /register-face`)**: Upload a reference photo for a student ID. *Required for recognition to work.*
3.  **Delete Member (`DELETE /members/{id}`)**: Cleanup test data.

## ✅ Full Feature Checklist

| Feature | Backend Endpoint | UI Implementation |
| :--- | :--- | :--- |
| **Auth** | `/login/access-token` | Login Screen |
| **Profile** | `/users/me` | Dashboard Header |
| **List Members** | `/members/` | Attendance Roster |
| **Create Member** | `POST /members/` | Admin Tools |
| **Delete Member** | `DELETE /members/{id}` | Admin Tools |
| **Register Face** | `/recognition/register-face` | Admin Tools |
| **Recognize Face** | `/recognition/recognize` | Attendance "Simulate Frame" |
| **Start Session** | `/attendance/start` | Dashboard "Live Now" Card |
| **Stop Session** | `/attendance/stop` | "Stop" Button |
| **Manual Verify** | `/attendance/verify` | Click on Student Avatar |
| **Finalize** | `/attendance/finalize` | "Finalize" Button |
| **Real-time** | `/attendance/ws` | Live Green Status Updates |

This UI is now a complete functional mirror of the intended system.
