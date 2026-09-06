@echo off
setlocal enabledelayedexpansion

echo ===============================================================
echo    UrbanEye AI -- BEL SIH 2026 Fleet Sensor Platform Launcher   
echo ===============================================================

:: 1. Check Docker is running
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not running or not installed.
    echo Please start Docker Desktop and run this script again.
    pause
    exit /b 1
)
echo [OK] Docker is running.

:: 2. Build and run containers
echo [INFO] Building and starting containers via docker compose...
docker compose up --build -d

:: 3. Poll backend /health endpoint until healthy
echo [INFO] Waiting for backend API to become healthy at http://localhost:8000/health...
set HEALTHY=0
for /L %%i in (1,1,30) do (
    powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:8000/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        set HEALTHY=1
        echo [OK] Backend API is healthy!
        goto :after_poll
    )
    echo   Attempt %%i/30: Backend still starting... retrying in 2s
    timeout /t 2 /nobreak >nul
)

:after_poll
if %HEALTHY% NEQ 1 (
    echo [ERROR] Backend failed to become healthy within 60 seconds.
    docker compose logs backend
    pause
    exit /b 1
)

:: 4. Seed database if empty
echo [INFO] Checking if database requires seeding...
powershell -Command "$r = Invoke-RestMethod -Uri 'http://localhost:8000/alerts' -TimeoutSec 3; if ($r.Count -eq 0) { exit 1 } else { exit 0 }" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Alerts table is empty. Seeding baseline alerts...
    docker compose exec -T backend python seed_data.py
) else (
    echo [OK] Database already contains alerts. Skipping redundant seed.
)

:: 5. Open browser
echo [INFO] Launching dashboard in browser: http://localhost:5173
start http://localhost:5173

:: 6. Summary
echo.
echo ===============================================================
echo    UrbanEye AI -- Stack Ready & Running!                        
echo ===============================================================
echo    Dashboard UI : http://localhost:5173
echo    API Swagger  : http://localhost:8000/docs
echo    Health Check : http://localhost:8000/health
echo    PostgreSQL   : localhost:5432 (Database: urbaneye_db)
echo ===============================================================
echo To view live logs:    docker compose logs -f
echo To shut down stack:   docker compose down
echo ===============================================================
