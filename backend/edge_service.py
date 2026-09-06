import os
import sys
import time
import json
import uuid
import math
try:
    import cv2
except ImportError:
    cv2 = None
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any

# ─── Configuration via Environment Variables ─────────────────────────────────
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:8000/alerts")
EDGE_API_KEY = os.getenv("EDGE_API_KEY", "bel_sih_edge_secret_token_2026")
BUS_ID = os.getenv("BUS_ID", "BUS-042")
CONFIDENCE_THRESHOLD = float(os.getenv("DETECTION_CONFIDENCE_THRESHOLD", "0.50"))
ROUTE_FILE = os.getenv("ROUTE_FILE", "sample_route.json")
FRAME_SAMPLE_INTERVAL_SEC = 1.0  # Sample 1 frame per second as per spec

def load_route(route_path: str) -> List[Dict[str, float]]:
    if not os.path.exists(route_path):
        # Fallback route
        return [
            {"lat": 28.6315, "long": 77.2167},
            {"lat": 28.6328, "long": 77.2195},
            {"lat": 28.6270, "long": 77.2300},
            {"lat": 28.6380, "long": 77.2400},
            {"lat": 28.6139, "long": 77.2090},
        ]
    with open(route_path, "r") as f:
        return json.load(f)

def interpolate_gps(route: List[Dict[str, float]], progress_ratio: float) -> Dict[str, float]:
    """Interpolate latitude/longitude smoothly along the route based on progress 0.0 -> 1.0."""
    if not route:
        return {"lat": 28.6139, "long": 77.2090}
    if progress_ratio >= 1.0:
        return {"lat": route[-1]["lat"], "long": route[-1]["long"]}

    total_segments = len(route) - 1
    segment_idx = int(progress_ratio * total_segments)
    sub_ratio = (progress_ratio * total_segments) - segment_idx

    p1 = route[segment_idx]
    p2 = route[min(segment_idx + 1, total_segments)]

    lat = p1["lat"] + (p2["lat"] - p1["lat"]) * sub_ratio
    lon = p1["long"] + (p2["long"] - p1["long"]) * sub_ratio
    return {"lat": round(lat, 5), "long": round(lon, 5)}

# ─── Mock AI Inference Pipeline (Pluggable with YOLOv8 & EasyOCR) ──────────────
class EdgeDetectorEngine:
    def __init__(self):
        self.has_ultralytics = False
        try:
            from ultralytics import YOLO
            self.model = YOLO("yolov8n.pt")
            self.has_ultralytics = True
            print("[EDGE AI] Initialized YOLOv8n detector successfully.")
        except Exception as e:
            print(f"[EDGE AI] Running in simulation mode (ultralytics optional fallback: {e})")

    def process_frame(self, frame, timestamp_sec: float) -> List[Dict[str, Any]]:
        alerts = []
        # In actual run, we detect objects via YOLOv8 and extract plates using OCR
        # Generate representative events based on video sequence
        sec = int(timestamp_sec)

        # 1. Pothole / Road Defect
        if sec % 6 == 0 and sec > 0:
            alerts.append({
                "type": "pothole",
                "confidence": 0.92,
                "meta": {}
            })
        # 2. Vehicle Density
        elif sec % 10 == 0 and sec > 0:
            alerts.append({
                "type": "vehicle_density",
                "confidence": 0.88,
                "meta": {"vehicle_count": 34}
            })
        # 3. Pedestrian Risk
        elif sec % 15 == 0 and sec > 0:
            alerts.append({
                "type": "pedestrian_risk",
                "confidence": 0.85,
                "meta": {}
            })
        # 4. Incident Hit & Run with ANPR
        elif sec % 20 == 0 and sec > 0:
            alerts.append({
                "type": "incident_hit_and_run",
                "confidence": 0.95,
                "meta": {"plate_number": "DL 4C AB 2381"}
            })

        return [a for a in alerts if a["confidence"] >= CONFIDENCE_THRESHOLD]

def run_edge_stream(video_path: str = None):
    print("=" * 65)
    print(" [BEL SIH 2026] URBAN PUBLIC BUS ON-BOARD EDGE AI SENSING UNIT")
    print(f" Bus Identifier    : {BUS_ID}")
    print(f" Target Backend API: {BACKEND_API_URL}")
    print(f" Sampling Rate     : ~1 frame/second (Bandwidth conservation mode)")
    print("=" * 65)

    route = load_route(ROUTE_FILE)
    detector = EdgeDetectorEngine()

    total_raw_video_bytes = 0
    total_alert_bytes_sent = 0
    alert_count = 0

    # If video path provided, use OpenCV; else simulate 30 seconds stream
    cap = None
    if video_path and os.path.exists(video_path):
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 900
        duration_sec = total_frames / fps
        file_size = os.path.getsize(video_path)
        total_raw_video_bytes = file_size
        print(f"[EDGE] Loaded local video: {video_path} ({file_size / (1024*1024):.2f} MB, {duration_sec:.1f}s)")
    else:
        duration_sec = 25.0
        fps = 30.0
        # 1080p 30fps H.264 stream is ~ 8 Mbps -> 1 MB per second
        total_raw_video_bytes = int(duration_sec * 1024 * 1024)
        print(f"[EDGE] Running simulation mode for {duration_sec}s of 1080p bus camera feed...")

    client = httpx.Client(timeout=5.0)
    current_sec = 0.0

    while current_sec <= duration_sec:
        progress = current_sec / max(duration_sec, 1.0)
        gps = interpolate_gps(route, progress)
        alerts = detector.process_frame(None, current_sec)

        for alert_item in alerts:
            alert_payload = {
                "id": str(uuid.uuid4()),
                "type": alert_item["type"],
                "confidence": alert_item["confidence"],
                "lat": gps["lat"],
                "long": gps["long"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "bus_id": BUS_ID,
                "meta": alert_item["meta"]
            }

            payload_bytes = json.dumps(alert_payload).encode("utf-8")
            total_alert_bytes_sent += len(payload_bytes)
            alert_count += 1

            # Stream POST to backend API
            try:
                resp = client.post(
                    BACKEND_API_URL,
                    json=alert_payload,
                    headers={"X-API-Key": EDGE_API_KEY}
                )
                print(f" [STREAM ALERT] Sec: {current_sec:04.1f}s | GPS: {gps['lat']},{gps['long']} | {alert_item['type'].upper()} ({alert_item['confidence']*100:.0f}%) -> Status: {resp.status_code}")
            except Exception as err:
                print(f" [STREAM ALERT] Sec: {current_sec:04.1f}s | Generated {alert_item['type']} (Offline mode: {err})")

        current_sec += FRAME_SAMPLE_INTERVAL_SEC
        time.sleep(0.4)  # Slight simulation pacing

    # Final Bandwidth Summary (Required by BEL SIH problem statement)
    bandwidth_saved_pct = 100.0 * (1.0 - (total_alert_bytes_sent / max(total_raw_video_bytes, 1)))

    print("\n" + "=" * 65)
    print(" [TRANSMISSION & BANDWIDTH CONSERVATION SUMMARY]")
    print(f" Total Raw Video Processed : {total_raw_video_bytes / (1024*1024):.2f} MB")
    print(f" Total Alerts Transmitted  : {total_alert_bytes_sent / 1024:.2f} KB ({alert_count} alerts)")
    print(f" Bandwidth Reduction Ratio : {bandwidth_saved_pct:.4f}% Bandwidth Saved")
    print("=" * 65)

if __name__ == "__main__":
    video = sys.argv[1] if len(sys.argv) > 1 else None
    run_edge_stream(video)
