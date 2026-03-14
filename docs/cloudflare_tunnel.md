# 🌐 Cloudflare Tunnel & Proxy Guide

Because **Smart Presence** relies heavily on real-time hardware access (your Webcam and Microphone), modern mobile browsers (Chrome/Safari) **strictly require** a secure HTTPS connection (SSL Certificate) to grant the frontend access to facial scanning on a mobile phone.

When running on a local home or college network (e.g., `192.168.1.7`), browsers throw "Untrusted Certificate" errors.

We bypass this limitation entirely and securely expose the application to the internet using **Cloudflare Tunnels (cloudflared)** combined with our own frontend-to-backend Proxy. 

---

## 1. Single-Port Proxy Architecture
Normally, the React Frontend runs on port `5173` and the FastAPI Backend runs on port `8000`. 
Exposing two separate tunnels is inefficient and introduces massive CORS (Cross-Origin Resource Sharing) headaches when running remotely.

### The Solution:
We compile the React frontend into static HTML/JS/CSS files (`/dist`), and we configure our **FastAPI backend (port 8000) to serve those static files itself!**

*   **If you request `/api/v1/...`**: FastAPI handles it as a backend database request.
*   **If you request `/` or `index.html`**: FastAPI serves the React PWA.

Now, we only have **one unified server** running on Port `8000`, making it trivially easy to tunnel securely.

---

## 2. Cloudflare Tunnel (cloudflared) Setup

Instead of opening dangerous ports on your home or college router, we use Cloudflare. `cloudflared` makes an outbound connection to Cloudflare's edge network, creating a secure pipe from your machine to their servers. 

Cloudflare then provides a free, mathematically verified SSL Certificate (`https://...trycloudflare.com`).

### Quick Tunnels (Temporary URLs)
If you don't own a domain, you can generate a random secure URL in seconds:

1.  Start your FastAPI server on port 8000.
2.  Open a new PowerShell window in your project directory.
3.  Run:
```powershell
# Windows
C:\tools\cloudflared.exe tunnel --url https://localhost:8000 --no-tls-verify
```
4.  Wait 10 seconds. Cloudflare will output an address like:
`https://your-random-words.trycloudflare.com`

---

## 3. Dedicated Tunnels (College / Permanent URLs)
If you want a professional, permanent URL (e.g., `https://smartpresence.yourcollege.edu`), you authenticate the tunnel to your own Cloudflare account.

### Step-by-step:
1.  **Login**: `cloudflared tunnel login`
2.  **Create**: `cloudflared tunnel create smart-presence-server`
3.  **Config**: Create `config.yml`:
    ```yaml
    tunnel: <YOUR-TUNNEL-ID>
    credentials-file: /path/to/.cloudflared/<ID>.json
    ingress:
      - hostname: smartpresence.example.com
        service: https://localhost:8000
        originRequest:
          noTLSVerify: true
      - service: http_status:404
    ```
4.  **Route**: `cloudflared tunnel route dns smart-presence-server smartpresence.example.com`
5.  **Run**: `cloudflared tunnel run smart-presence-server`

---

## PWA Installability 📱
Once your phone connects to the secure Cloudflare `https` URL, the "Untrusted" flags disappear.
Because we have configured a strict `manifest.json` and a Service Worker for aggressive caching, your phone's browser will now display an **"Add to Home Screen"** or **"Install App"** prompt seamlessly, granting full access to the 60FPS biometric scanner.
