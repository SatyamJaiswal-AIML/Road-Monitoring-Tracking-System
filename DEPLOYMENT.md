# UrbanEye AI  Production Deployment Guide
**Smart India Hackathon 2026  Problem Statement 26124 (Bharat Electronics Limited)**

This manual guide explains how to deploy the UrbanEye AI full stack into production.  
*(Note: No deployment commands are automated by this script. Follow each step manually).*

---

## 1. Architecture & Hosting Strategy Recommendation

We recommend **Option A: Split Managed Cloud (Vercel for Dashboard + Railway/Render + Neon for Backend & DB)** for hackathon demos and production agility:

* **Why Option A (Recommended):**
  * **Zero VPS maintenance:** Automatic HTTPS certificates, global CDN edge caching for the Vite dashboard, and zero Linux server patching.
  * **Isolated scaling:** Edge AI ingestion spikes do not degrade dashboard frontend rendering performance.
  * *Tradeoff:* Requires configuring two separate project dashboards (Vercel + Railway/Render) instead of one single VPS container host.

* **Option B (Alternative - Single VPS via Docker Compose):**
  * Spin up an Ubuntu 24.04 VPS (Hetzner, AWS EC2, or DigitalOcean), install Docker, and run `docker compose up -d` behind Nginx/Caddy reverse proxy.
  * *Tradeoff:* Single point of failure; requires manual SSL certificate renewal, firewall maintenance, and swap memory tuning.

---

## 2. Step-by-Step Manual Deployment (Recommended Path)

### Step 2.1: Database (Neon PostgreSQL)
1. Log in to [Neon Console](https://console.neon.tech).
2. Create or select your project (e.g., `busEye`).
3. Under **Dashboard**, click **Connect** and select **Connection string**.
4. Copy the URI string:
   ```text
   postgresql://[user]:[password]@[host]/[dbname]?sslmode=require
   ```
5. Keep this URI handy for Step 2.2.

---

### Step 2.2: Backend Deployment (Railway or Render)

1. Log in to [Railway.app](https://railway.app) or [Render.com](https://render.com).
2. Click **New Project** ? **Deploy from GitHub repo**.
3. Select your repository and set the **Root Directory** to `/backend`.
4. Set the build and start settings:
   * **Build Command:** `pip install --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt`
   * **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   * **Exposed Port:** `8000` (or leave default `$PORT`)
5. Configure the **Environment Variables** in the Railway/Render dashboard:

| Variable Name | Production Value | Source / Local Reference |
| :--- | :--- | :--- |
| `DATABASE_URL` | *Your Neon connection string from Step 2.1* | Stored in `.env` |
| `EDGE_API_KEY` | `bel_sih_edge_secret_token_2026` *(or your secure key)* | Stored in `.env` |
| `ALLOWED_ORIGINS` | `https://your-dashboard-domain.vercel.app` *(add after Step 2.3)* | Restricts CORS |
| `RATE_LIMIT_PER_MINUTE` | `120` | Security rate limit |
| `REPLAY_WINDOW_MINUTES` | `30` | Anti-replay freshness window |
| `DPDP_ANONYMIZE_PLATES` | `true` | Privacy compliance |

6. **Deploy the Service:** Click **Deploy**.
7. Once deployed, copy your public backend URL (e.g., `https://urbaneye-backend.up.railway.app`).

---

### Step 2.3: Checkpoint: Run DB Initialization & Seed Manually
> [!IMPORTANT]
> Do not execute automated scripts against production databases without verifying connection.

1. In Railway/Render, open the **Shell / Console** tab for the backend service.
2. Verify connectivity:
   ```bash
   python -c "import urllib.request; print('Testing environment...')"
   ```
3. Run the database table initialization and baseline seed script:
   ```bash
   python seed_data.py
   ```
4. Confirm terminal logs output: `[SUCCESS] Seeded 10 alerts into database.`

---

### Step 2.4: Dashboard Deployment (Vercel)

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** ? **Project** ? Import your GitHub repository.
3. Configure the Project Settings:
   * **Framework Preset:** Vite
   * **Root Directory:** `dashboard` (or edit if deploying from root)
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
4. Expand **Environment Variables** and enter:

| Variable Name | Production Value | Description |
| :--- | :--- | :--- |
| `VITE_USE_MOCK` | `false` | Disables mock fixtures, switches to live backend |
| `VITE_API_BASE_URL` | `https://urbaneye-backend.up.railway.app` | Public backend URL from Step 2.2 (No trailing slash) |
| `VITE_MAPBOX_TOKEN` | *(Optional Mapbox token for 3D extrusions)* | Optional |

5. Click **Deploy**.
6. Once deployment finishes, copy your Vercel URL (e.g., `https://urbaneye-dashboard.vercel.app`).
7. **Update Backend CORS:** Return to Railway/Render, update `ALLOWED_ORIGINS` to include your Vercel URL, and trigger a redeploy.

---

## 3. Verification & Health Check

| Checkpoint | Target URL | Expected Working State | Broken State Indicators |
| :--- | :--- | :--- | :--- |
| **Backend Health** | `https://[backend-url]/health` | `{"status":"ok","database":"connected"}` | Status 500 or `"database":"connection error"` |
| **Alerts API** | `https://[backend-url]/alerts` | JSON array containing >= 10 alert records | Empty array `[]` or 401/403 |
| **Dashboard Map** | `https://[dashboard-url]` | Interactive dark-mode map showing Delhi markers, live floating metric cards, and 4s polling | Blank screen, loading spinner stuck indefinitely, or console `CORS error` |

---

## 4. Rollback Procedure

If a deployed version causes runtime issues:
1. **Dashboard (Vercel):**
   * Navigate to **Deployments** tab in Vercel.
   * Locate the previous successful deployment.
   * Click the three dots `...` ? **Instant Rollback** / **Promote to Production**.
2. **Backend (Railway/Render):**
   * Go to **Deployments** history.
   * Click on the prior working commit and select **Rollback to this deployment**.
   * Database data in Neon remains intact and unaffected by code rollback.
