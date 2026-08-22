# CipherShare — Run & Deployment Guide

CipherShare is an end-to-end encrypted, peer-to-peer file transfer and persistent vault application built with **FastAPI**, **React**, **TypeScript**, **Tailwind CSS**, and **WebRTC DataChannels**.

---

## 📋 Prerequisites

- **Python**: `>= 3.13`
- **Package Manager**: `pip`
- **Node.js**: 18.x or newer (only if modifying React frontend)
- **Modern Browser**: Chrome, Edge, Firefox, Brave, Safari (supports WebRTC + Web Crypto API)

---

## ⚡ Quick Start

### 1. Setup Virtual Environment & Install Dependencies
```bash
cd "D:\AI & ML\Projects\P2P\backend"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Start Backend Server
```bash
cd "D:\AI & ML\Projects\P2P\backend"
python main.py run
```
*(Or `uvicorn app.app:app --host 0.0.0.0 --port 8000 --reload`)*

Open your browser at **[http://localhost:8000](http://localhost:8000)**.

---

## 🛠️ Modes of Running

### Mode A: All-in-One Production Mode (Recommended)
FastAPI serves both the REST API, WebSocket signaling, and the built React SPA frontend.

```bash
cd "D:\AI & ML\Projects\P2P\backend"
python main.py run
```
- **App URL**: `http://localhost:8000`

---

### Mode B: Development Mode (Hot Reloading)
Run backend and frontend independently for live code editing.

```bash
# Terminal 1: Backend
cd "D:\AI & ML\Projects\P2P\backend"
python main.py --reload

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
   python main.py --host 0.0.0.0 --port 8000
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

---

## 📖 Architecture Overview

```
backend/
├── app/
│   ├── app.py                     # FastAPI application factory, CORS, exception handlers, SPA fallback
│   ├── startup.py                 # Lifespan: DB initialization on startup, engine cleanup on shutdown
│   ├── core/
│   │   ├── config.py              # Settings (pydantic-settings) with SQLite, STUN, CORS, limits
│   │   ├── exceptions.py          # CustomException hierarchy (RoomNotFound, InvalidPassphrase, etc.)
│   │   ├── schemas.py             # CamelCaseModel, BaseResponse[T], BaseErrorResponse
│   │   └── utils/mixins.py        # TimestampMixin (created_at, updated_at)
│   ├── db/
│   │   └── database.py            # SQLAlchemy 2.0 Async engine, AsyncSessionLocal, init_db
│   ├── models/
│   │   ├── room.py                # RoomModel (id, passphrase_hash, created_at, updated_at)
│   │   └── vault.py               # VaultItemModel (AES encrypted data, iv, salt, sizes)
│   ├── schemas/
│   │   ├── room.py                # Room request & response schemas
│   │   ├── vault.py               # Vault item CRUD schemas
│   │   └── signaling.py           # DeviceInfo, SignalMessage schemas
│   ├── services/
│   │   ├── room_service.py        # RoomService: bcrypt hashing, validation, STUN config
│   │   ├── vault_service.py       # VaultService: encrypted note & file storage CRUD
│   │   └── signaling_service.py   # SignalingService: in-memory peer presence & WebRTC signal relay
│   └── api/
│       └── v1/
│           ├── deps.py            # Route dependencies
│           ├── router.py          # API v1 router
│           └── endpoints/
│               ├── rooms.py       # Room endpoints (create, join, peers, config)
│               ├── vault.py       # Vault CRUD endpoints
│               └── signaling.py   # WebSocket signaling endpoint (/ws/{room_id})
├── main.py                        # Typer CLI runner
└── pyproject.toml                 # uv project configuration (Python >= 3.13)
```

---

## 🔧 Useful Commands

| Action | Command |
|---|---|
| Run backend test suite | `cd backend && python test_suite.py` |
| Start backend server | `cd backend && python main.py run` |
| Rebuild frontend bundle | `cd frontend && npm run build` |
| Type check frontend | `cd frontend && npm run build` |
