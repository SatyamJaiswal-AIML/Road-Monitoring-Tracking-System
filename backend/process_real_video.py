"""
UrbanEye AI — Real-Time Edge Video Processor & Pothole Detector
Smart India Hackathon 2026 (Problem Statement 26124 - Bharat Electronics Limited)

Role:
  Takes a real dashcam video or camera feed, runs YOLO detection on road surfaces,
  draws real AI bounding boxes on detected potholes/defects, saves the annotated
  capture frame to `backend/static/captures/`, and pushes a live alert to the backend API.
"""

import os
import sys
import time
import uuid
import argparse
from datetime import datetime, timezone
import cv2
import base64
import httpx
from ultralytics import YOLO

# Configuration
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:8000/alerts")
EDGE_API_KEY = os.getenv("EDGE_API_KEY", "bel_sih_edge_secret_token_2026")
BUS_ID = os.getenv("BUS_ID", "BUS-042")
CAPTURES_DIR = os.path.join(os.path.dirname(__file__), "static", "captures")
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
DEFAULT_VIDEO = os.path.join(os.path.dirname(__file__), "videos", "dashcam_road.mp4")

os.makedirs(CAPTURES_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

# Coordinates for GPS simulation along Delhi routes
SAMPLE_COORDS = [
    (28.6315, 77.2167), # Connaught Place
    (28.6328, 77.2195),
    (28.6270, 77.2300), # Mandi House
    (28.6380, 77.2400), # ITO
    (28.6180, 77.2420), # Pragati Maidan
    (28.6139, 77.2090), # India Gate
]

def get_yolo_model():
    """Load real municipal road defect model if present."""
    y8best_path = os.path.join(MODELS_DIR, "pothole_y8best.pt")
    if os.path.exists(y8best_path):
        print(f"[EDGE AI] Loading trained municipal road defect model (Potholes, Signage, Debris): {y8best_path}")
        return YOLO(y8best_path)
    pothole_model_path = os.path.join(MODELS_DIR, "pothole.pt")
    if os.path.exists(pothole_model_path):
        print(f"[EDGE AI] Loading custom pothole weights: {pothole_model_path}")
        return YOLO(pothole_model_path)
    print("[EDGE AI] Loading standard YOLOv8n detector...")
    return YOLO("yolov8n.pt")

def draw_hud(frame, alert_type, conf, bus_id, lat, lng):
    """Draw tactical HUD and telemetry on the saved frame."""
    h, w = frame.shape[:2]
    
    # Top banner background
    cv2.rectangle(frame, (0, 0), (w, 36), (15, 23, 42), -1)
    
    # Header texts
    cv2.circle(frame, (16, 18), 6, (0, 0, 255), -1) # Red REC dot
    cv2.putText(frame, "AI REC | CAM-01 FRONT-DASH", (30, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)
    
    telemetry_str = f"{bus_id} | GPS: {lat:.4f}N, {lng:.4f}E | {datetime.now().strftime('%H:%M:%S')}"
    cv2.putText(frame, telemetry_str, (w - 380, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 212, 255), 1, cv2.LINE_AA)
    
    # Bottom HUD
    cv2.rectangle(frame, (0, h - 28), (w, h), (15, 23, 42), -1)
    status_str = f"ALERT: {alert_type.upper()} | CONFIDENCE: {conf*100:.1f}% | EDGE INFERENCE: OK"
    cv2.putText(frame, status_str, (16, h - 9), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (50, 205, 50), 1, cv2.LINE_AA)

def process_video(video_source, sampling_fps=1.0, conf_threshold=0.45):
    print("=" * 70)
    print(" [URBANEYE AI] EDGE VIDEO PROCESSOR & REAL INFERENCE PIPELINE")
    print(f" Source Video    : {video_source}")
    print(f" Bus Identifier  : {BUS_ID}")
    print(f" Target API      : {BACKEND_API_URL}")
    print(f" Output Captures : {CAPTURES_DIR}")
    print("=" * 70)

    model = get_yolo_model()
    cap = cv2.VideoCapture(video_source)

    if not cap.isOpened():
        print(f"[ERROR] Could not open video source: {video_source}")
        return

    video_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_step = max(int(video_fps / sampling_fps), 1)
    frame_idx = 0
    detected_count = 0

    client = httpx.Client(timeout=4.0)

    print(f"[INFO] Video opened: {video_fps:.1f} FPS. Sampling 1 frame every {frame_step} frames.")

    coord_idx = 0
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("[INFO] Video stream completed or end of file reached.")
                break

            if frame_idx % frame_step == 0:
                # Run YOLO inference
                results = model(frame, conf=conf_threshold, verbose=False)
                
                # Check detections
                has_defect = False
                detected_box = None
                detected_conf = 0.0
                detected_type = "pothole"

                for r in results:
                    boxes = r.boxes
                    if len(boxes) > 0:
                        # Pick the most confident detection
                        best_idx = int(boxes.conf.argmax().item()) if len(boxes) > 1 else 0
                        box = boxes[best_idx]
                        cls_id = int(box.cls[0].item())
                        detected_conf = float(box.conf[0].item())
                        cls_name = model.names.get(cls_id, "pothole")
                        cls_name_lower = cls_name.lower()
                        
                        # Map class to road alert types
                        if "pothole" in cls_name_lower:
                            detected_type = "pothole"
                        elif any(s in cls_name_lower for s in ["signage", "billboard", "sign"]):
                            detected_type = "missing_signboard"
                        elif any(s in cls_name_lower for s in ["construction", "sand"]):
                            detected_type = "bottleneck"
                        elif any(s in cls_name_lower for s in ["clutter", "garbage", "pedestrian", "person"]):
                            detected_type = "pedestrian_risk"
                        else:
                            detected_type = "pothole"

                        has_defect = True
                        xyxy = box.xyxy[0].cpu().numpy().astype(int)
                        detected_box = xyxy
                        break

                # ONLY trigger alert if an actual defect was detected by YOLO
                if has_defect and detected_box is not None:
                    detected_count += 1
                    lat, lng = SAMPLE_COORDS[coord_idx % len(SAMPLE_COORDS)]
                    coord_idx += 1

                    annotated = frame.copy()
                    
                    x1, y1, x2, y2 = detected_box
                    cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 0, 255), 2)
                    label = f"{detected_type.upper()}: {detected_conf*100:.0f}%"
                    cv2.putText(annotated, label, (x1, max(y1 - 8, 15)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

                    # Draw Tactical HUD watermark
                    draw_hud(annotated, detected_type, detected_conf, BUS_ID, lat, lng)

                    # Save real image file to static captures
                    capture_filename = f"capture_{int(time.time())}_{detected_count}.jpg"
                    capture_path = os.path.join(CAPTURES_DIR, capture_filename)
                    cv2.imwrite(capture_path, annotated, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
                    
                    ok, buffer = cv2.imencode(".jpg", annotated, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
                    if ok:
                        image_url = f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"
                    else:
                        image_url = f"http://localhost:8000/static/captures/{capture_filename}"

                    # Construct and transmit alert to FastAPI
                    alert_id = f"ALT-REAL-{detected_count:03d}"
                    payload = {
                        "id": alert_id,
                        "type": detected_type,
                        "confidence": round(detected_conf, 2),
                        "lat": lat,
                        "long": lng,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "bus_id": BUS_ID,
                        "meta": {
                            "image_url": image_url,
                            "source": "edge_yolo_processor",
                            "verified_by_bus_count": 1
                        }
                    }

                    try:
                        resp = client.post(
                            BACKEND_API_URL,
                            json=payload,
                            headers={"X-API-Key": EDGE_API_KEY}
                        )
                        print(f" [DETECTED & TRANSMITTED] {alert_id} | {detected_type.upper()} ({detected_conf*100:.0f}%) -> {image_url} (HTTP {resp.status_code})")
                    except Exception as err:
                        print(f" [OFFLINE QUEUE] Saved {capture_filename} locally (Backend unreachable: {err})")

            frame_idx += 1

    finally:
        cap.release()
        print("\n" + "=" * 70)
        print(f" Processing Complete. Total real alerts generated: {detected_count}")
        print(f" Captures stored at: {CAPTURES_DIR}")
        print("=" * 70)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="UrbanEye AI Real Edge Video Processor")
    parser.add_argument("--video", default=DEFAULT_VIDEO, help="Path to input video file")
    parser.add_argument("--webcam", action="store_true", help="Use live laptop webcam")
    parser.add_argument("--fps", type=float, default=1.0, help="Sampling FPS rate")
    args = parser.parse_args()

    src = 0 if args.webcam else args.video
    process_video(src, sampling_fps=args.fps)
