<div align="center">

# 🛡️ Smart Presence
**The Ultimate Offline-First, AI-Powered Biometric Attendance System**

[![Developer](https://img.shields.io/badge/Developer-Sylvester--Jones-blue?style=for-the-badge&logo=github)](https://github.com/sylvernjones557)
[![Platform](https://img.shields.io/badge/Platform-100%25--Offline-orange?style=for-the-badge)](https://github.com/sylvernjones557/FEB10)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](./LICENSE)

---

*Say goodbye to sluggish cloud APIs, expensive subscriptions, and invasive data sharing.* <br>
*Say hello to **Smart Presence**—where state-of-the-art AI meets zero-trust architecture.*

</div>

## 🌟 Why Smart Presence?

Traditional attendance systems are slow, cloud-dependent, and invasive. **Smart Presence** flips the script by prioritizing speed, privacy, and user experience:

- **🔐 100% Zero-Cloud Architecture**: No Supabase, no Firebase, no AWS. Your biometric data and records never leave your local hardware. Complete GDPR & FERPA compliance out of the box.
- **⚡ AI-Native Edge Processing**: Powered by a heavily optimized **InsightFace** engine that runs blazingly fast entirely on standard CPUs. No expensive GPUs required.
- **🤖 Agentic Ready (MCP)**: The world's first attendance system equipped with a built-in **Model Context Protocol (MCP)** bridge, allowing your favorite LLMs (Claude, ChatGPT) to interact with your school data as a local tool.
- **📱 Premium "Liquid Glass" PWA**: A stunning, installable Progressive Web App featuring haptic feedback, 60FPS camera scanning, background animations, and an adaptive UI.

---

## 🏗️ The Survival Architecture

Built to withstand offline environments and poor network conditions, Smart Presence is divided into highly specialized microservices:

```mermaid
graph TD
    A[📱 PWA Frontend<br>React + TypeScript + Vite] -->|HTTPS Proxy| B(⚡ FastAPI Backend<br>Python + Uvicorn )
    B <--> C[(💾 SQLiteDB<br>Relational Data)]
    B <--> D[(🧠 ChromaDB<br>Vector Embeddings)]
    B <--> E[🤖 InsightFace<br>ML Engine]
    
    F[🌐 Cloudflare Tunnel] <--> A
    
    G[🧠 MCP Gateway] <--> B
    H[External AI Agents] <--> G
```

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend UI** | React 19 + TypeScript + Tailwind | Premium Admin & Staff Dashboard with Haptics |
| **Backend Core** | FastAPI + Uvicorn | High-performance Python bridge & API |
| **ML Logic** | CPU-Only ONNX Engine | Ultra-fast local face matching |
| **Storage** | SQLite + ChromaDB | Relational data & 512-dim Vector embeddings |
| **Automation** | Full MCP Server | 42+ Tools for AI Agent integration |
| **Networking** | Cloudflare Tunnels | Secure remote access without exposing ports |

---

## 🔥 Key Features

*   **Group & Class Management**: Beautifully manage organizations, classes, students, and schedules.
*   **Rapid Face Enrollment**: Capture 3D angles in seconds right from your phone.
*   **Live Group Scanning**: Scan an entire classroom at once with real-time bounding boxes and confidence tracking.
*   **Haptic Tactile Engine**: Your phone vibrates distinctively on successful scans, errors, and navigation.
*   **Test Class Environment**: Practice and demo the software instantly with the unrestricted `testclass` teacher account.

---

## 📚 Documentation & Setup

We have moved all detailed setup instructions to the `/docs` folder for cleanliness. Please choose your starting point:

1. [**Backend Setup Guide**](./docs/backend.md) - Start here to spin up the AI engine and databases.
2. [**Frontend Setup Guide**](./docs/frontend.md) - Instructions to run the beautiful React UI.
3. [**MCP Integration Guide**](./docs/mcp_gateway.md) - Connect Smart Presence to your AI Assistants.
4. [**Cloudflare Tunnel & Remote Access**](./docs/cloudflare_tunnel.md) - Access your local server securely over the internet.

---

## 🤝 Community & Support

This project is built for the next generation of privacy-conscious institutions.

**Connect with the Developer:**
- **GitHub**: [sylvernjones557](https://github.com/sylvernjones557)
- **Project Link**: [Smart Presence](https://github.com/sylvernjones557/FEB10)

*Built with ❤️ by Sylvester Jones.*
