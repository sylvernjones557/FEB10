# Smart Presence Frontend

Vite + React UI for the Smart Presence attendance system. The frontend currently runs on mock data and local state while backend integration is pending.

## Prerequisites
- Node.js 18+

## Install
1. Install dependencies:
   - npm install

## Run (Dev)
1. Start the dev server:
   - npm run dev

## Build
1. Create a production build:
   - npm run build
2. Preview the build locally:
   - npm run preview

## Project Structure
- App entry: frontend/App.tsx
- Pages: frontend/pages/
- Shared UI: frontend/components/
- Mock data + constants: frontend/constants.tsx
- Types: frontend/types.ts

## Current Behavior (V2)
- Authentication uses backend JWT; staff vs admin is based on backend roles.
- Navigation is local state (no router). Back behavior is handled in App.tsx and page-level BackButton usage.
- Attendance UI is in frontend/pages/ClassAttendance.tsx with optional pre-selected group context.

## Dependencies
- UI icons: lucide-react
- Charts: recharts

## Notes
- Backend integration is active (groups/members/sessions).
- Avoid changing UI styling unless requested; keep logic updates minimal.
