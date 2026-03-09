# 🛡️ Smart Presence by Sylvester Jones

[![Developer](https://img.shields.io/badge/Developer-Sylvester--Jones-blue?style=for-the-badge&logo=github)](https://github.com/sylvernjones557)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](./LICENSE)
[![Platform](https://img.shields.io/badge/Platform-100%25--Offline-orange?style=for-the-badge)](https://github.com/sylvernjones557/FEB10)

**Smart Presence** is a cutting-edge, AI-powered attendance system designed for total privacy, zero cloud dependency, and high-performance execution on consumer hardware.

Created and Maintained by **[Sylvester Jones (@sylvernjones557)](https://github.com/sylvernjones557)**.

---

## 🌟 Why Smart Presence?
Traditional attendance systems are slow, cloud-dependent, and invasive. **Smart Presence** flips the script:
- **Zero Cloud**: No Supabase, no Firebase, no AWS. Your data stays on *your* hardware.
- **AI-Native**: Powered by a custom-tuned **InsightFace** engine running on local **CPU**.
- **Agentic Ready**: The world's first attendance system with a built-in **Model Context Protocol (MCP)** bridge, allowing LLMs to interact with your data as a local tool.

---

## 🏗️ Technical Masterpiece
Build with a focus on resilient, "Survivor" infrastructure:

| Component | Technology | Role |
| :--- | :--- | :--- |
| **User Interface** | React 19 + TypeScript + Vite | Premium Admin & Staff Dashboard |
| **Processing** | FastAPI + Uvicorn | High-performance Python bridge |
| **Logic** | CPU-Only ML Engine | Ultra-fast face matching (No GPU needed) |
| **Storage** | SQLite + ChromaDB | Relational data & Vector embeddings |
| **Automation** | MCP Gateway | 42+ Tools for AI Agent integration |

---

---

## 🚀 Recent Updates (V2.1)
The latest version introduces significant enhancements for field usability and premium feel:
- **📳 Haptic Logic**: Native tactile feedback for mobile web using `web-haptics`. Success/Error/Impact vibrations for scanning and navigation.
- **👩‍🏫 Teacher UI**: A specialized dashboard for staff members (`testclass` user) optimized for quick attendance and class management.
- **🧪 Test Class System**: Built-in unrestricted testing mode for groups named "Test Class" (Code: `TEST`), allowing attendance at any time.
- **🛡️ Resilience Layer**: Global Error Boundaries and loading states to eliminate "blank screen" issues even on high-latency mobile connections.

## 📂 Project Structure
```text
FEB10/
├── frontend_smart_presence/   # The high-end React UI (Haptics integrated)
├── backend_smart_presence/    # FastAPI + ML Engine + Local DBs
├── mcp_smart_presence/        # The AI Gateway (Feature Add-on)
└── diagrams/                  # Visual architecture by Sylvester Jones
```

---

## ✨ Premium Experience
Smart Presence isn't just a tool; it's a mobile-first PWA experience:
- **Glassmorphism UI**: High-end translucent interfaces with animated background "blobs".
- **Tactile Responses**: Every scan and menu tap provides physical feedback.
- **Adaptive Loading**: Smart skeletons and spinners ensure the UI feels fast on any network.

---

## 🛠️ Getting Started
### 1️⃣ Backend Setup
```bash
cd backend_smart_presence
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
run_server.bat
```
### 2️⃣ Frontend Setup
```bash
cd frontend_smart_presence
npm install
npm run dev
```

---

## 🤝 Open Source & Contributions
This project is released under the **MIT License**. We believe in open, secure, and privacy-respecting technology.

**Connect with the Developer:**
- **GitHub**: [sylvernjones557](https://github.com/sylvernjones557)
- **Project Link**: [Smart Presence](https://github.com/sylvernjones557/FEB10)

---
*Built with ❤️ by Sylvester Jones for the next generation of privacy-conscious institutions.*
