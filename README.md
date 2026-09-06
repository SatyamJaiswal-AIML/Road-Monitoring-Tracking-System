# UrbanEye AI — Mobile Urban Intelligence Platform
**Smart India Hackathon 2026 — Problem Statement 26124 (Bharat Electronics Limited)**  
*Turning Public Transport Fleet into Real-Time City Sensors*

---

## Quick Start (One Command)

```bash
# 1. Clone repository
git clone <repo-url>
cd PROJECTSIH

# 2. Launch full stack (Linux / macOS)
chmod +x start.sh
./start.sh

# Or on Windows:
start.bat
```

Done! The launcher automatically:
1. Validates Docker daemon status
2. Builds and starts PostgreSQL (PostGIS), FastAPI Backend, Edge-AI Simulation, and React Dashboard
3. Polls `/health` until the API is online
4. Automatically seeds the database if empty
5. Opens the browser at `http://localhost:5173`

---

## Service Endpoints

| Service | Port | Description |
| :--- | :--- | :--- |
| **Dashboard UI** | `http://localhost:5173` | React 19 + TypeScript + Leaflet/Mapbox Dark Mode UI |
| **Backend API Docs** | `http://localhost:8000/docs` | FastAPI Swagger interactive documentation |
| **API Health Check** | `http://localhost:8000/health` | Service & DB connectivity check |
| **Database** | `localhost:5432` | PostgreSQL + PostGIS (`urbaneye_db`) |

---

## Folder Layout

```text
PROJECTSIH/
+-- backend/            # FastAPI REST API, models, edge-AI simulator, seed scripts
+-- dashboard/          # React + Vite + TypeScript dashboard UI
+-- docker-compose.yml  # Root container orchestration for all services
+-- .env                # Consolidated root environment configuration
+-- start.sh            # One-click start script (Linux/macOS)
+-- start.bat           # One-click start script (Windows)
+-- DEPLOYMENT.md       # Step-by-step production deployment guide
+-- README.md           # This document
```

---

## Switching Between Mock and Live Mode

In the root `.env` file:
* Set `VITE_USE_MOCK=false` to connect the dashboard to the real backend and database.
* Set `VITE_USE_MOCK=true` to run completely offline with built-in mock fixtures.

---

## Edge AI Simulation

To run a live sensing route simulation manually:
```bash
cd backend
python edge_service.py
```
This processes a 1080p camera feed at 1Hz along Delhi bus route `BUS-042`, streams detected road defects to the backend, and demonstrates a **99.9944% bandwidth conservation ratio**.
