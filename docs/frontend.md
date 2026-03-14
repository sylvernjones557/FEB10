# ✨ Smart Presence Frontend Guide

The frontend is a beautifully crafted, responsive Progressive Web App (PWA). Built with **React 19**, **TypeScript**, and **Vite**, it utilizes "Liquid Glass" styling and dynamic micro-animations to achieve a truly premium user experience.

## Tech Stack
*   **Framework**: React 19 + TypeScript
*   **Bundler/Server**: Vite 6
*   **Styling**: Tailwind CSS + Custom `index.css` Glassmorphism Tokens
*   **Icons**: Lucide React
*   **State & Fetching**: Axios, React Hooks
*   **Haptics**: `web-haptics` library
*   **Routing**: React Router (via simplified components or custom router)

---

## 🎨 Design Philosophy
The entire application was designed to feel like a **High-Fidelity Mobile Application**. 

Key elements of this design approach include:
1.  **Glassmorphism (`.glass`)**: Translucent panels atop animated gradients ("blobs").
2.  **Tactile Engine**: Whenever physical actions occur—like marking someone present or receiving a camera error—the UI communicates this via the mobile device's vibration engine.
3.  **Adaptive Camera Views**: `FaceScanner.tsx` has been specifically tuned out-of-the-box to use `640x480` unconstrained frame rates to avoid rendering lag or CPU throttling on low-power devices.
4.  **Resilience Elements**: All transitions were intentionally removed from `*` to optimize CSS rendering on Chromium mobile engines.

---

## Quick Start Setup

Ensure you have **Node.js** (v18+) installed.

### 1. Install Packages
Navigate to the `frontend_smart_presence/frontend_smart_presence` directory.

```bash
npm install
```

### 2. Configure Environment `.env`
Your Vite development server needs to know where the FastAPI backend is located. Ensure the `.env` looks like this:

```env
VITE_API_URL=http://localhost:8000
VITE_PWA_ENABLED=true
```

### 3. Run Development Server
To launch the Hot-Module-Replacement (HMR) server:

```bash
npm run dev
```

### 4. Build for Production (The PWA)
To compile the absolute smallest footprint with bundled `service-worker.js` offline capabilities:

```bash
npm run build
```

The resulting files will be in the `/dist` folder, heavily minified and cache-ready.

---

## Features

### 📳 Haptic Integrations
-  Vibrations occur on login, success toasts, and error alerts.
-  **Code entry**: The haptic interface is wrapped in safe `try/catch` logic to ensure strict browser policy compliance without crashing the app.

### 👩‍🏫 The Teacher Mode
The app adapts its UI strictly based on authentication roles. `testclass` has a curated experience just for testing group scanning features safely.
