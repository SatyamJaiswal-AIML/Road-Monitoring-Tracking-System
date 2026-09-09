@echo off
title UrbanEye AI - SIH 2026 Presentation Launcher
color 0A

echo ===============================================================
echo     UrbanEye AI -- Smart India Hackathon 2026 (BEL-26124)       
echo           AI-Powered Mobile Urban Intelligence Platform        
echo ===============================================================
echo.

:: 1. Start Backend FastAPI Server
echo [1/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "UrbanEye AI - Backend (Port 8000)" cmd /k "cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

:: 2. Start Frontend Vite Server
echo [2/3] Starting React + Vite Frontend on http://localhost:5173 ...
start "UrbanEye AI - Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

:: 3. Wait for services to spin up
echo [3/3] Waiting 4 seconds for servers to initialize...
timeout /t 4 /nobreak >nul

:: 4. Open Dashboard in Default Browser
echo Launching UrbanEye AI Dashboard in your browser...
start http://localhost:5173

echo.
echo ===============================================================
echo    STACK IS LIVE & RUNNING!
echo    - Dashboard UI: http://localhost:5173
echo    - Swagger API : http://localhost:8000/docs
echo    - Database    : Neon Cloud PostgreSQL (Connected)
echo ===============================================================
echo.
echo [OPTIONAL LIVE DEMO]
echo Do you want to start a live bus edge AI streaming simulation?
echo This will stream real-time pothole, ANPR, and crowd alerts live
echo onto the dashboard screen while you present to judges.
echo.
set /p DEMO_EDGE="Run Live Edge Bus Simulator now? (Y/N, default=N): "
if /I "%DEMO_EDGE%"=="Y" (
    echo Starting Edge AI Telemetry Stream...
    start "UrbanEye AI - Edge Bus Streamer" cmd /k "cd backend && python edge_service.py"
)

echo.
echo Presentation environment ready. Good luck with the judges!
pause
