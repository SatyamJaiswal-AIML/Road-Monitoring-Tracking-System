#!/usr/bin/env bash
set -e

echo "==============================================================="
echo "   UrbanEye AI — BEL SIH 2026 Fleet Sensor Platform Launcher   "
echo "==============================================================="

# 1. Check Docker daemon is running
if ! docker info >/dev/null 2>&1; then
    echo "[ERROR] Docker is not running or not installed."
    echo "Please start Docker Desktop and re-run this script."
    exit 1
fi
echo "[OK] Docker is running."

# 2. Start all services via docker-compose
echo "[INFO] Building and starting containers via docker compose..."
docker compose up --build -d

# 3. Poll backend /health endpoint until healthy
echo "[INFO] Waiting for backend API to become healthy at http://localhost:8000/health..."
RETRIES=30
DELAY=2
HEALTHY=false

for ((i=1; i<=RETRIES; i++)); do
    if curl -s -f http://localhost:8000/health >/dev/null 2>&1; then
        HEALTHY=true
        echo "[OK] Backend API is healthy!"
        break
    fi
    echo "  Attempt ${i}/${RETRIES}: Backend still starting... retrying in ${DELAY}s"
    sleep $DELAY
done

if [ "$HEALTHY" = false ]; then
    echo "[ERROR] Backend service failed to become healthy within 60s."
    docker compose logs backend
    exit 1
fi

# 4. Seed database if empty
echo "[INFO] Checking if database requires seeding..."
ALERT_COUNT=$(curl -s http://localhost:8000/alerts | grep -o '"id"' | wc -l || echo "0")
if [ "$ALERT_COUNT" -eq "0" ]; then
    echo "[INFO] Alerts table is empty. Seeding initial baseline alerts..."
    docker compose exec -T backend python seed_data.py || echo "[WARN] Seed script execution finished."
else
    echo "[OK] Database already contains $ALERT_COUNT alerts. Skipping redundant seed."
fi

# 5. Open browser automatically
DASHBOARD_URL="http://localhost:5173"
echo "[INFO] Launching dashboard in browser: $DASHBOARD_URL"

if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$DASHBOARD_URL" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
    open "$DASHBOARD_URL" >/dev/null 2>&1 &
elif command -v start >/dev/null 2>&1; then
    start "$DASHBOARD_URL" >/dev/null 2>&1 &
fi

# 6. Print summary
echo ""
echo "==============================================================="
echo "   UrbanEye AI — Stack Ready & Running!                        "
echo "==============================================================="
echo "   Dashboard UI : http://localhost:5173"
echo "   API Swagger  : http://localhost:8000/docs"
echo "   Health Check : http://localhost:8000/health"
echo "   PostgreSQL   : localhost:5432 (Database: urbaneye_db)"
echo "==============================================================="
echo "To view live logs:    docker compose logs -f"
echo "To shut down stack:   docker compose down"
echo "==============================================================="
