# Understanding Outbound and Inbound Network Connections & DNS Role

This guide explains how outbound and inbound network connections work, the role of DNS, and how college network configurations can impose restrictions.

---

## 1. Outbound vs Inbound Connections

### Outbound Connections
- Initiated from your PC to an external server (e.g., accessing websites, APIs, tunnels like cloudflared).
- Example: When you run `cloudflared tunnel`, your PC makes an outbound HTTPS connection to Cloudflare.
- Outbound connections are often allowed for web browsing, but may be restricted for other services.

### Inbound Connections
- Initiated from an external device/server to your PC (e.g., someone accessing your local web server from outside).
- Example: If you run a web server on your PC and want your phone to access it directly, that’s an inbound connection.
- Inbound connections require open ports and firewall rules; often blocked in college networks for security.

---

## 2. Role of DNS
- DNS (Domain Name System) translates domain names (e.g., example.com) to IP addresses.
- When you access a website or tunnel, your PC queries DNS to resolve the domain.
- Colleges may use their own DNS servers to filter or block certain domains.
- If DNS is restricted, you may not be able to resolve external domains, affecting outbound connections.

---

## 3. College Network Restrictions
- **Outbound Restrictions:** Colleges may block outbound connections to certain ports or domains (e.g., only allow HTTP/HTTPS, block tunnels).
- **Inbound Restrictions:** Usually block all inbound connections to protect internal systems.
- **DNS Restrictions:** Colleges may use custom DNS to block or redirect requests, filter content, or prevent access to tunneling services.
- **Firewall/Proxy:** Colleges often use firewalls and proxies to control traffic, log activity, and enforce policies.

---

## 4. How to Check

### Outbound Connection Test
- Try accessing an external website or API from your PC.
- Run:
  ```powershell
  curl https://www.cloudflare.com
  ```
- If you get a response, outbound HTTPS is allowed.

### Inbound Connection Test
- Run a simple web server on your PC:
  ```powershell
  python -m http.server 8000
  ```
- Try accessing `http://<PC_IP>:8000` from your phone (must be on same network).
- If blocked, inbound connections are restricted.

### DNS Test
- Run:
  ```powershell
  nslookup www.google.com
  ```
- If you get an IP address, DNS is working. If not, DNS may be restricted.

---

## 5. Where College Configurations Play a Role
- Colleges set firewall rules, proxy settings, and DNS configurations to control network access.
- These settings can:
  - Block outbound connections to tunneling services.
  - Prevent inbound access to local servers.
  - Filter DNS queries to block certain domains.

---

## Summary
- Outbound: PC to outside; often allowed, but can be restricted.
- Inbound: Outside to PC; usually blocked.
- DNS: Needed for domain resolution; can be filtered.
- College configurations (firewall, proxy, DNS) enforce these restrictions.

---

*Last updated: March 10, 2026*