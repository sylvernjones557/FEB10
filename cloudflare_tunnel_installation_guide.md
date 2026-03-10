# Cloudflare Tunnel Installation Guide for College System

This guide provides clear, step-by-step instructions to install and configure Cloudflare Tunnel (cloudflared) on your college system.

## Prerequisites
- Admin access to the system (Windows assumed; adjust for Linux/Mac as needed)
- A Cloudflare account
- Your college domain added to Cloudflare

---

## 1. Download cloudflared

1. Go to the official Cloudflare download page: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
2. Download the Windows executable (`cloudflared.exe`).
3. Move `cloudflared.exe` to a folder in your PATH (e.g., `C:\Program Files\cloudflared` or `C:\Windows`).

---

## 2. Authenticate cloudflared with Cloudflare

1. Open PowerShell as Administrator.
2. Run:
   ```powershell
   cloudflared tunnel login
   ```
3. A browser window will open. Log in to your Cloudflare account and select your college domain.
4. After authentication, a certificate file will be saved locally.

---

## 3. Create a Tunnel

1. In PowerShell, run:
   ```powershell
   cloudflared tunnel create <TUNNEL_NAME>
   ```
   Replace `<TUNNEL_NAME>` with a descriptive name (e.g., `college-tunnel`).
2. Note the Tunnel ID shown in the output.

---

## 4. Configure the Tunnel

1. Create a configuration file (e.g., `C:\Users\<YourUser>\.cloudflared\config.yml`).
2. Example config:
   ```yaml
   tunnel: <TUNNEL_ID>
   credentials-file: C:\Users\<YourUser>\.cloudflared\<TUNNEL_ID>.json
   ingress:
     - hostname: <your-college-subdomain.example.com>
       service: http://localhost:8000
     - service: http_status:404
   ```
   - Replace `<TUNNEL_ID>`, `<YourUser>`, and `<your-college-subdomain.example.com>` as needed.
   - Set the correct local service port (e.g., 8000).

---

## 5. Route DNS

1. In PowerShell, run:
   ```powershell
   cloudflared tunnel route dns <TUNNEL_NAME> <your-college-subdomain.example.com>
   ```
2. This creates a CNAME in Cloudflare DNS for your subdomain.

---

## 6. Run the Tunnel

1. Start the tunnel with:
   ```powershell
   cloudflared tunnel run <TUNNEL_NAME>
   ```
2. The tunnel should now be active and accessible via your subdomain.

---

## 7. (Optional) Run as a Service

1. To run the tunnel as a Windows service:
   ```powershell
   cloudflared service install
   ```
2. The tunnel will start automatically on boot.

---

## Troubleshooting
- Check logs: `cloudflared tunnel run <TUNNEL_NAME> --loglevel debug`
- Ensure firewall allows outbound connections.
- Verify DNS settings in Cloudflare dashboard.

---

## References
- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [cloudflared GitHub](https://github.com/cloudflare/cloudflared)

---

*Last updated: March 10, 2026*
