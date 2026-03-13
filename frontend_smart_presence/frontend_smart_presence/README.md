# Smart Presence Frontend

React + TypeScript UI for the Smart Presence attendance system, built with Vite.

## Prerequisites

- Node.js 18+

## Setup

```bash
npm install
npm run dev
```

Opens at http://localhost:3000 (or https://localhost:3000 if HTTPS enabled).

## Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
frontend_smart_presence/
├── App.tsx              # Main app entry, routing
├── index.tsx            # React DOM mount
├── index.html           # HTML template
├── constants.tsx         # Shared constants
├── types.ts             # TypeScript types
├── vite.config.ts       # Vite configuration
├── components/          # Reusable UI components
│   ├── FaceScanner.tsx  # Camera/face capture
│   ├── Layout.tsx       # Page layout wrapper
│   └── Toast.tsx        # Notification toasts
├── pages/               # Page components
│   ├── Dashboard.tsx
│   ├── ClassDirectory.tsx
│   ├── ClassAttendance.tsx
│   ├── Enrollment.tsx
│   ├── Reports.tsx
│   ├── Login.tsx
│   └── ...
└── services/            # API service layer (Axios)
```

## Key Features

- JWT authentication (staff / admin roles)
- Live face scanning for attendance
- Class directory and student management
- Attendance reports and charts
- HTTPS support for camera access on LAN devices

## Dependencies

- **React 19**, **Vite 6**, **TypeScript**
- **Axios** — HTTP client
- **Lucide React** — Icons
- **Recharts** — Charts
