# Hawk AI — Mobile Urban Intelligence & Road Defect Monitoring Platform

**Smart India Hackathon 2026 — Problem Statement 26124 (Bharat Electronics Limited - BEL)**  
*Turning Public Transit Fleets into Real-Time Edge-AI City Road Condition Sensors*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-blueviolet)](https://github.com/ultralytics/ultralytics)
[![OpenCV](https://img.shields.io/badge/OpenCV-4.8+-5C3EE8?logo=opencv&logoColor=white)](https://opencv.org)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

---

## 🌟 Overview

Hawk AI is an onboard Edge-AI road monitoring and defect tracking system. Built for municipal corporations, transit authorities, and road transport departments, the system converts standard dashcams on city buses into automated road inspection scanners.

The platform combines an **OpenCV + YOLOv8 vision pipeline** running at the edge with a centralized cloud dashboard, providing automated pothole detection, multi-frame vehicle speed & rash driving analysis, real-time bounding box video playback, and one-click PWD tender work order generation.

---

## 🚀 Key Features

### 1. 🎥 Edge-AI Video Defect Analysis Pipeline
- **OpenCV + YOLOv8 Neural Inference**: Decompresses road footage frame-by-frame and applies adaptive road ROI filtering.
- **3-Level Severity Classification**:
  - **Level 1 (Low — 🟢)**: Minor pavement defects; scheduled for routine monitoring.
  - **Level 2 (Medium — 🟡)**: Noticeable road depression; scheduled for 72-hour maintenance.
  - **Level 3 (Critical — 🔴)**: Severe pothole posing vehicle hazard; triggers immediate PWD intervention.
- **Laplacian Edge Variance & Depth Estimation**: Calculates structural depth score and road area percentage for each defect.
- **Vehicle Speed & Rash Driving Detection**: Multi-frame centroid tracker estimating vehicle speeds in km/h and lateral swerve metrics.

### 2. 🎬 Synchronized Video Player with Live Bounding Boxes
- **Real-Time 60 FPS Canvas Overlay**: Overlays high-contrast corner brackets, severity badges, and confidence metrics directly on the playing video.
- **Synchronized Defect Timeline Reel**: Displays thumbnail snapshots for every detected pothole along the video timeline. Clicking any card instantly seeks the video to that timestamp.
- **Active In-Frame Glow**: The defect card visible in the current video frame automatically pulses with an IN FRAME badge.
- **⛶ Big Screen / Theater Mode**: Expand video playback to full viewport width (74vh height) with a collapsible inspector sidebar.

### 3. 📸 Unique Defect Snapshots & PWD Work Order Generation
- **Automatic Crop Extraction**: Automatically extracts high-resolution bounding box crops for each pothole and saves them with unique identifiers (/images/alerts/pothole_<id>.jpg).
- **One-Click PWD Tender Work Order PDF**: Client-side & backend PDF generation conforming to Public Works Department (PWD) tender standards, complete with photo evidence, GPS coordinates, severity classification, and repair guidelines.

### 4. 💾 Database Persistence & Defect Management
- **Full Database Ingestion**: Video alerts automatically persist to SQLite / PostgreSQL database via SQLAlchemy models.
- **Single & Batch Deletion API**: Endpoints to remove false positives and minor defects (DELETE /alerts/{id}, DELETE /api/video/potholes/{detection_id}, and POST /api/video/potholes/delete-batch).
- **Immediate Video Overlay Sync**: Deleting a pothole immediately updates the overlay canvas, removing its bounding box from playback in real-time.

### 5. 🗺️ Centralized Fleet Intelligence Dashboard
- **Interactive Leaflet / Mapbox Map**: Dark-mode road map showing GPS-geotagged defects, severity clusters, and transit corridors.
- **Route Replay**: Scrub through historical bus routes to inspect road conditions over time.
- **Analytics & Incident Management**: Real-time breakdown of open defects, fleet coverage, and maintenance priorities.

---

## 🏗️ Architecture & Technology Stack

`	ext
┌─────────────────────────────────────────────────────────────┐
│                          Hawk AI                            │
└─────────────────────────────────────────────────────────────┘
                               │
       ┌───────────────────────┴───────────────────────┐
       ▼                                               ▼
┌──────────────────────────────┐        ┌─────────────────────────────┐
│     FastAPI Backend          │        │    React 19 Dashboard       │
│  • OpenCV & YOLOv8 Engine    │        │  • TypeScript + Vite        │
│  • SQLite / PostgreSQL       │◄──────►│  • Synchronized Video Canvas│
│  • REST Endpoints & Schemas  │        │  • Leaflet & Mapbox         │
│  • PWD Work Order PDF Engine │        │  • Zustand State Management │
└──────────────────────────────┘        └─────────────────────────────┘
`

---

## ⚡ Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- Git

### 1. Clone the Repository
`ash
git clone https://github.com/SatyamJaiswal-AIML/Road-Monitoring-Tracking-System.git
cd Road-Monitoring-Tracking-System
`

### 2. Backend Setup
`ash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
`
The FastAPI backend will be live at http://localhost:8000 with interactive Swagger docs at http://localhost:8000/docs.

### 3. Frontend Setup
In a new terminal:
`ash
cd frontend
npm install
npm run dev
`
The dashboard will be live at https://localhost:5173.

---

## 🔗 Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/video/analyze | Upload road video for full OpenCV + YOLOv8 defect inspection |
| POST | /api/video/save-alerts | Batch save and upsert video detections into the database |
| DELETE | /api/video/potholes/{id} | Delete a detected pothole from database and session |
| POST | /api/video/potholes/delete-batch | Batch delete potholes by list of detection IDs |
| POST | /api/video/clear-all | Clear all video detections from the SQLite database |
| GET | /alerts | Query alerts with filters (type, status, severity, bounds) |
| DELETE | /alerts/{id} | Delete an alert by ID |
| GET | /alerts/{id}/work-order-pdf | Generate and download official PWD Tender Work Order PDF |
| GET | /health | Health and database connectivity check |

