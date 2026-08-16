# NEXUS_P2P — Run & Deployment Guide

NEXUS_P2P is an end-to-end encrypted, peer-to-peer file transfer and persistent vault application built with **FastAPI**, **React**, **TypeScript**, **Tailwind CSS**, and **WebRTC DataChannels**.

---

## 📋 Prerequisites

- **Python**: 3.10 or newer (tested on 3.12)
- **Node.js**: 18.x or newer
- **Modern Browser**: Chrome, Edge, Firefox, Brave, Safari (supports WebRTC + Web Crypto API)

---

## ⚡ Quick Start (Fastest Way)

### 1. Install Backend Dependencies
```bash
cd "D:\AI & ML\Projects\P2P\backend"
pip install -r requirements.txt
```

### 2. Build Frontend
```bash
cd "D:\AI & ML\Projects\P2P\frontend"
npm run build
```

### 3. Start the Server
```bash
cd "D:\AI & ML\Projects\P2P\backend"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Open your browser at **[http://localhost:8000](http://localhost:8000)**.

---

## 🛠️ Modes of Running

### Mode A: All-in-One Production Mode (Recommended)
FastAPI serves both the REST API, WebSocket signaling, and the built React SPA frontend.

```bash
# Terminal 1
cd "D:\AI & ML\Projects\P2P\backend"
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```
- **App URL**: `http://localhost:8000`

---

### Mode B: Development Mode (Hot Reloading)
Run backend and frontend independently for live code editing.

```bash
# Terminal 1: Backend
cd "D:\AI & ML\Projects\P2P\backend"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend (Vite Dev Server)
cd "D:\AI & ML\Projects\P2P\frontend"
npm run dev
```
- **Frontend Dev URL**: `http://localhost:5173` (proxies `/api` and `/ws` automatically to port `8000`)

---

## 📱 Running Across Devices on the Same Wi-Fi (PC ↔ Mobile)

To share files directly between your PC, phone, or tablet over your local Wi-Fi:

1. **Find your PC's Local IP address**:
   - On Windows: Run `ipconfig` in terminal (look for `IPv4 Address`, e.g., `192.168.1.50`).
2. **Start the backend with host `0.0.0.0`**:
   ```bash
   cd "D:\AI & ML\Projects\P2P\backend"
   python -m uvicorn main:app --host 0.0.0.0 --port 8000
   ```
3. **Open on your PC**:
   `http://localhost:8000` or `http://192.168.1.50:8000`
4. **Open on your Phone/Tablet**:
   Scan the **QR Code** generated inside the room modal, or navigate to `http://192.168.1.50:8000` and enter the 8-character Room Code.

> **💡 Note for Mobile Web Crypto / Camera**:
> Modern mobile browsers require HTTPS for camera/screen sharing and full Web Crypto API features if accessed over an IP address. See below for free 1-click HTTPS tunneling.

---

## 🌐 Running Across the Internet (Remote Transfer)

To share files with friends or devices outside your local Wi-Fi network:

### Option 1: Cloudflare Tunnel (Free & Instant HTTPS)
Install Cloudflare Tunnel and run:
```bash
cloudflared tunnel --url http://localhost:8000
```
You will get an instant public HTTPS URL like `https://random-name.trycloudflare.com` that works worldwide.

### Option 2: Ngrok (Free HTTPS Tunnel)
```bash
ngrok http 8000
```
Use the provided `https://xxxx.ngrok-free.app` link.

### Option 3: Deploy to VPS / Cloud Server
- **Server**: Ubuntu / Debian / Docker
- Run the FastAPI app using Uvicorn or Gunicorn behind Nginx / Caddy with an SSL certificate.

---

## 📖 How to Use the Features

| Feature | How to Use |
|---|---|
| **Create a Room** | Enter any passphrase on the landing page and click *Create Encrypted Room*. |
| **Join a Room** | Enter the 8-character room code and passphrase, or scan the QR code. |
| **1-Click Auto-Join** | Open the *Pair Device* modal, check **1-Click Auto Join**, and copy/share the link. |
| **Send Messages** | Type in the bottom input bar and press Enter. |
| **Clipboard Sharing** | Click the 📋 clipboard icon next to the input box to instantly broadcast your clipboard content. |
| **Direct File Transfer** | Click the 📎 paperclip icon → *Document / File* or drag & drop. Transfer streams in 64KB chunks directly peer-to-peer. |
| **Folder Sharing** | Click 📎 → *Folder (Auto-Zip)* to automatically package and stream folders as a ZIP archive. |
| **Live Camera Snap** | Click 📎 → *Camera Snap* to capture a photo from your webcam and send it instantly. |
| **Screen Snippet** | Click 📎 → *Screen Snippet* to capture a screenshot of your screen or window. |
| **Encrypted Vault** | Click the *Vault* button in the top right. Add private encrypted notes or files (up to 10MB) stored permanently in SQLite encrypted with **AES-256-GCM**. |
| **Rename Device** | Click your device badge in the top right to change your nickname (e.g. *MacBook Pro*, *Pixel 8*). |

---

## 🔧 Useful Commands

| Action | Command |
|---|---|
| Run backend test suite | `cd backend && python -u test_api.py` |
| Rebuild frontend bundle | `cd frontend && npm run build` |
| Type check frontend | `cd frontend && npm run build` |
| Reset database | Delete `backend/nexus.db` (it will auto-recreate on restart) |
