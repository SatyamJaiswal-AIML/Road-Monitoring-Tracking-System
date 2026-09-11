"""
vision_engine.py — UrbanEye AI Edge Vision Pipeline
=====================================================
SIH Problem Statement 26124 (Bharat Electronics Limited)

Implements two major AI pipelines using OpenCV + YOLOv8:

1. Pothole Detection & 3-Level Severity Ranking
   - Level 1 (Low / Routine Monitoring)    : Minor cracks/shallow depressions
   - Level 2 (Medium / Scheduled Action)   : Moderate potholes
   - Level 3 (CRITICAL / IMMEDIATE ACTION) : Deep craters or large potholes

2. Vehicle Speed & Rash Driving Detection
   - Multi-frame centroid tracking (IoU-based)
   - Speed estimation via temporal displacement & calibration factor
   - Rash driving: sudden lateral swerve detection

All detections include GPS coordinates (lat, long) for Leaflet map rendering.
"""

import os
import cv2
import uuid
import base64
import math
import logging
from datetime import datetime, timezone
from typing import Optional
import numpy as np

logger = logging.getLogger("vision_engine")

# ─── Try importing ultralytics (YOLOv8) ─────────────────────────────────────
try:
    from ultralytics import YOLO
    _YOLO_AVAILABLE = True
except (ImportError, Exception) as err:
    _YOLO_AVAILABLE = False
    logger.warning(f"ultralytics not available ({err}) — running in OpenCV-only mode.")

# ─── Constants ───────────────────────────────────────────────────────────────
def _find_yolo_vehicle_weights() -> str:
    custom = os.getenv("YOLO_VEHICLE_MODEL_PATH")
    if custom and os.path.exists(custom):
        return custom
    candidates = [
        "yolov8n.pt",
        os.path.join(os.path.dirname(__file__), "..", "yolov8n.pt"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "yolov8n.pt"),
        "/app/yolov8n.pt",
    ]
    for p in candidates:
        if os.path.exists(p):
            return os.path.abspath(p)
    return "yolov8n.pt"

YOLO_VEHICLE_MODEL_PATH = _find_yolo_vehicle_weights()
DEFAULT_POTHOLE_PATH = os.path.join(os.path.dirname(__file__), "..", "weights", "pothole_yolov8.pt")
YOLO_POTHOLE_MODEL_PATH = os.getenv("YOLO_POTHOLE_MODEL_PATH", DEFAULT_POTHOLE_PATH)

# Pothole area thresholds (percentage of road ROI area)
POTHOLE_SEV1_MAX_PCT = 1.5   # Level 1: <= 1.5% — Low severity
POTHOLE_SEV2_MAX_PCT = 4.5   # Level 2: 1.5%–4.5% — Medium severity
# Level 3: > 4.5% or high depth score — Critical

# Speed thresholds
SPEED_LIMIT_KMPH = float(os.getenv("SPEED_LIMIT_KMPH", "60.0"))
RASH_LATERAL_THRESHOLD = float(os.getenv("RASH_LATERAL_THRESHOLD", "0.35"))

# Calibration: pixels-per-meter (tune for typical CCTV/dashcam perspective)
PX_PER_METER = float(os.getenv("PX_PER_METER", "40.0"))

# YOLO vehicle class IDs (COCO dataset indices)
VEHICLE_CLASSES = {
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
}


# ═════════════════════════════════════════════════════════════════════════════
#  GPS Helpers
# ═════════════════════════════════════════════════════════════════════════════

def interpolate_gps(route: list[dict], frame_idx: int, total_frames: int) -> dict:
    """Interpolate lat/long along a GPS route based on frame index."""
    if not route:
        return {"lat": 28.6139, "long": 77.2090}
    if total_frames <= 1:
        return {"lat": route[0]["lat"], "long": route[0]["long"]}

    progress = min(frame_idx / max(total_frames - 1, 1), 1.0)
    total_seg = len(route) - 1
    seg_idx = int(progress * total_seg)
    sub_r = (progress * total_seg) - seg_idx
    p1 = route[seg_idx]
    p2 = route[min(seg_idx + 1, total_seg)]
    return {
        "lat": round(p1["lat"] + (p2["lat"] - p1["lat"]) * sub_r, 6),
        "long": round(p1["long"] + (p2["long"] - p1["long"]) * sub_r, 6),
    }


# ═════════════════════════════════════════════════════════════════════════════
#  Pothole Severity Classifier (OpenCV-based)
# ═════════════════════════════════════════════════════════════════════════════

def _classify_pothole_severity(area_pct: float, depth_score: float) -> dict:
    """
    Classify pothole severity into 3 levels.

    Parameters
    ----------
    area_pct    : pothole bounding-box area as % of road ROI area
    depth_score : 0.0–1.0 proxy for depth (from edge intensity variance)
    """
    # Override to Level 3 if depth score is extreme even for small potholes
    if depth_score > 0.75 or area_pct > POTHOLE_SEV2_MAX_PCT:
        return {
            "severity_level": 3,
            "severity_label": "Critical",
            "action_required": "🚨 IMMEDIATE ACTION REQUIRED — Road closure risk, severe vehicle damage",
            "color": "#ef4444",
        }
    elif area_pct > POTHOLE_SEV1_MAX_PCT or depth_score > 0.45:
        return {
            "severity_level": 2,
            "severity_label": "Medium",
            "action_required": "⚠️ Scheduled Maintenance — Repair within 72 hours",
            "color": "#f59e0b",
        }
    else:
        return {
            "severity_level": 1,
            "severity_label": "Low",
            "action_required": "📋 Routine Monitoring — Log and schedule inspection",
            "color": "#22c55e",
        }


def detect_potholes_opencv(
    frame: np.ndarray,
    frame_idx: int,
    total_frames: int,
    route: list[dict],
    confidence_threshold: float = 0.50,
) -> list[dict]:
    """
    Detect potholes in a single video frame using OpenCV adaptive thresholding.

    Returns a list of pothole detections with severity, bounding box, and GPS coords.
    """
    detections = []
    h, w = frame.shape[:2]

    # ── Define road ROI: bottom 55% of frame (road surface visible zone) ──
    roi_y_start = int(h * 0.45)
    roi = frame[roi_y_start:, :]
    roi_area = roi.shape[0] * roi.shape[1]

    # ── Pre-processing ──────────────────────────────────────────────────────
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)

    # Bilateral filter to remove noise while preserving edges
    blurred = cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75)

    # Adaptive threshold to isolate dark regions (potholes)
    thresh = cv2.adaptiveThreshold(
        blurred, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        blockSize=51, C=8
    )

    # Morphological closing to fill small gaps within pothole regions
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)
    cleaned = cv2.morphologyEx(closed, cv2.MORPH_OPEN, kernel, iterations=1)

    # ── Find contours ───────────────────────────────────────────────────────
    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    for cnt in contours:
        area = cv2.contourArea(cnt)

        # Filter by minimum area (ignore tiny specks, < 800 px²)
        if area < 800:
            continue

        x, y, bw, bh = cv2.boundingRect(cnt)
        aspect_ratio = bw / max(bh, 1)

        # Potholes tend to be roughly elliptical, filter very thin shapes
        if aspect_ratio > 5.0 or aspect_ratio < 0.15:
            continue

        # ── Depth Score via Laplacian edge variance ──────────────────────
        roi_patch = gray[y: y + bh, x: x + bw]
        laplacian = cv2.Laplacian(roi_patch, cv2.CV_64F)
        depth_score = float(np.clip(np.var(laplacian) / 5000.0, 0.0, 1.0))

        # ── Area as % of road ROI ────────────────────────────────────────
        area_pct = (area / roi_area) * 100.0

        # ── Confidence proxy: combine area-pct and depth score ───────────
        confidence = float(np.clip(0.4 + depth_score * 0.4 + (area_pct / 5.0) * 0.2, 0.0, 1.0))

        if confidence < confidence_threshold:
            continue

        severity = _classify_pothole_severity(area_pct, depth_score)
        gps = interpolate_gps(route, frame_idx, total_frames)

        # Adjust bounding box back to full-frame coordinates
        abs_y = roi_y_start + y
        bbox = [int(x), int(abs_y), int(bw), int(bh)]

        detections.append({
            "detection_id": str(uuid.uuid4())[:8].upper(),
            "type": "pothole",
            "confidence": round(confidence, 3),
            "lat": gps["lat"],
            "long": gps["long"],
            "frame_idx": frame_idx,
            "bounding_box": bbox,
            "area_pct": round(area_pct, 3),
            "depth_score": round(depth_score, 3),
            **severity,
        })

    return detections


# ═════════════════════════════════════════════════════════════════════════════
#  Vehicle Tracker (Simple IoU / Centroid tracker)
# ═════════════════════════════════════════════════════════════════════════════

class VehicleTrack:
    """Tracks a single vehicle across frames."""
    __slots__ = ("track_id", "centroids", "bboxes", "label", "class_name",
                 "speeds_kmh", "lateral_positions", "last_frame")

    def __init__(self, track_id: int, cx: float, cy: float,
                 bbox: list, class_name: str, frame_idx: int):
        self.track_id = track_id
        self.centroids = [(cx, cy, frame_idx)]
        self.bboxes = [bbox]
        self.label = class_name
        self.class_name = class_name
        self.speeds_kmh: list[float] = []
        self.lateral_positions: list[float] = []
        self.last_frame = frame_idx

    def update(self, cx: float, cy: float, bbox: list, frame_idx: int, fps: float):
        dt = (frame_idx - self.last_frame) / max(fps, 1.0)
        if dt > 0 and self.centroids:
            prev_cx, prev_cy, _ = self.centroids[-1]
            dy = abs(cy - prev_cy)   # vertical displacement in pixels
            dist_m = dy / PX_PER_METER
            speed_kmh = (dist_m / dt) * 3.6
            self.speeds_kmh.append(speed_kmh)
            self.lateral_positions.append(cx)

        self.centroids.append((cx, cy, frame_idx))
        self.bboxes.append(bbox)
        self.last_frame = frame_idx

    @property
    def avg_speed_kmh(self) -> float:
        return float(np.mean(self.speeds_kmh)) if self.speeds_kmh else 0.0

    @property
    def max_speed_kmh(self) -> float:
        return float(np.max(self.speeds_kmh)) if self.speeds_kmh else 0.0

    @property
    def rash_score(self) -> float:
        """Lateral swerve score: ratio of max lateral deviation to frame width proxy."""
        if len(self.lateral_positions) < 3:
            return 0.0
        diffs = [abs(self.lateral_positions[i] - self.lateral_positions[i - 1])
                 for i in range(1, len(self.lateral_positions))]
        return float(np.mean(diffs)) / 640.0   # normalised to 640px width


class VehicleTracker:
    """IoU-based multi-object tracker for vehicles across video frames."""

    def __init__(self, iou_threshold: float = 0.25, max_lost_frames: int = 8):
        self.tracks: dict[int, VehicleTrack] = {}
        self._next_id = 0
        self.iou_threshold = iou_threshold
        self.max_lost_frames = max_lost_frames

    @staticmethod
    def _iou(a: list, b: list) -> float:
        ax, ay, aw, ah = a
        bx, by, bw, bh = b
        ix = max(ax, bx)
        iy = max(ay, by)
        ix2 = min(ax + aw, bx + bw)
        iy2 = min(ay + ah, by + bh)
        if ix2 <= ix or iy2 <= iy:
            return 0.0
        inter = (ix2 - ix) * (iy2 - iy)
        union = aw * ah + bw * bh - inter
        return inter / max(union, 1)

    def update(self, detections: list[dict], frame_idx: int, fps: float):
        """Match new detections to existing tracks, create new tracks as needed."""
        matched_track_ids: set[int] = set()

        for det in detections:
            bbox = det["bbox"]
            cx = bbox[0] + bbox[2] / 2
            cy = bbox[1] + bbox[3] / 2
            class_name = det["class_name"]
            best_iou = self.iou_threshold
            best_tid = None

            for tid, track in self.tracks.items():
                if tid in matched_track_ids:
                    continue
                last_bbox = track.bboxes[-1]
                iou = self._iou(last_bbox, bbox)
                if iou > best_iou:
                    best_iou = iou
                    best_tid = tid

            if best_tid is not None:
                self.tracks[best_tid].update(cx, cy, bbox, frame_idx, fps)
                matched_track_ids.add(best_tid)
            else:
                new_track = VehicleTrack(self._next_id, cx, cy, bbox, class_name, frame_idx)
                self.tracks[self._next_id] = new_track
                matched_track_ids.add(self._next_id)
                self._next_id += 1

        # Remove stale tracks not seen recently
        stale = [tid for tid, t in self.tracks.items()
                 if frame_idx - t.last_frame > self.max_lost_frames]
        for tid in stale:
            del self.tracks[tid]


# ═════════════════════════════════════════════════════════════════════════════
#  Main Road Vision Analyzer
# ═════════════════════════════════════════════════════════════════════════════

class RoadVisionAnalyzer:
    """
    Master vision engine combining:
      - YOLOv8 object detection (vehicles + optional pothole model)
      - OpenCV pothole/road-defect detection
      - Multi-frame vehicle speed & rash-driving analysis
      - GPS geotagging for all events
    """

    def __init__(self, confidence_threshold: float = 0.50):
        self.confidence_threshold = confidence_threshold
        self.vehicle_model: Optional[object] = None
        self.pothole_model: Optional[object] = None
        self.onnx_pothole_session: Optional[object] = None
        self.onnx_input_name: Optional[str] = None
        self._init_yolo()
        self.tracker = VehicleTracker()

    def _init_yolo(self):
        # 1. First priority: Load Microsoft-signed ONNX pothole model (Bypasses SmartAppControl)
        onnx_path = os.path.join(os.path.dirname(__file__), "..", "models", "pothole.onnx")
        if os.path.exists(onnx_path):
            try:
                import onnxruntime as ort
                self.onnx_pothole_session = ort.InferenceSession(onnx_path)
                self.onnx_input_name = self.onnx_pothole_session.get_inputs()[0].name
                logger.info(f"YOLOv8 ONNX pothole model loaded: {onnx_path}")
            except Exception as e:
                logger.warning(f"ONNX pothole model init failed: {e}")

        if not _YOLO_AVAILABLE:
            logger.info("YOLO PyTorch unavailable — using ONNX/OpenCV engine.")
            return

        # Load vehicle tracking YOLO model
        try:
            self.vehicle_model = YOLO(YOLO_VEHICLE_MODEL_PATH)
            logger.info(f"YOLOv8 vehicle model loaded: {YOLO_VEHICLE_MODEL_PATH}")
        except Exception as e:
            logger.warning(f"YOLO vehicle model init failed ({e}), falling back to OpenCV vehicle detection.")
            self.vehicle_model = None

        # Load pre-trained pothole YOLO PyTorch model if available
        if os.path.exists(YOLO_POTHOLE_MODEL_PATH):
            try:
                self.pothole_model = YOLO(YOLO_POTHOLE_MODEL_PATH)
                logger.info(f"Pre-trained YOLOv8 pothole model loaded: {YOLO_POTHOLE_MODEL_PATH}")
            except Exception as e:
                logger.warning(f"Pothole YOLO init failed ({e})")
                self.pothole_model = None

    def _yolo_pothole_detections(
        self, frame: np.ndarray, frame_idx: int, total_frames: int, route: list[dict]
    ) -> list[dict]:
        """Detect potholes using fine-tuned YOLOv8 weights and rank 3-level severity."""
        h, w = frame.shape[:2]
        roi_y_start = int(h * 0.40)
        roi_area = (h - roi_y_start) * w
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gps = interpolate_gps(route, frame_idx, total_frames)

        detections = []

        # ── ONNX YOLOv8 Inference ──
        if self.onnx_pothole_session is not None:
            blob = cv2.dnn.blobFromImage(frame, 1.0/255.0, (640, 640), swapRB=True, crop=False)
            outputs = self.onnx_pothole_session.run(None, {self.onnx_input_name: blob})
            preds = np.transpose(outputs[0][0], (1, 0)) # (8400, 37)
            boxes, confs = [], []
            scale_x = w / 640.0
            scale_y = h / 640.0
            for row in preds:
                score = float(row[4])
                if score >= self.confidence_threshold:
                    cx, cy, bw_raw, bh_raw = row[:4]
                    x1 = int((cx - bw_raw / 2.0) * scale_x)
                    y1 = int((cy - bh_raw / 2.0) * scale_y)
                    bw_px = int(bw_raw * scale_x)
                    bh_px = int(bh_raw * scale_y)
                    boxes.append([x1, y1, bw_px, bh_px])
                    confs.append(score)
            if boxes:
                idxs = cv2.dnn.NMSBoxes(boxes, confs, self.confidence_threshold, 0.45)
                for idx in idxs:
                    i = idx[0] if isinstance(idx, (list, tuple, np.ndarray)) else idx
                    bx, by, bw, bh = boxes[i]
                    x1 = max(0, min(bx, w - 1))
                    y1 = max(0, min(by, h - 1))
                    bw = max(1, min(bw, w - x1))
                    bh = max(1, min(bh, h - y1))
                    area = bw * bh
                    area_pct = (area / max(roi_area, 1)) * 100.0
                    patch = gray[y1:y1+bh, x1:x1+bw]
                    if patch.size > 0:
                        laplacian = cv2.Laplacian(patch, cv2.CV_64F)
                        depth_score = float(np.clip(np.var(laplacian) / 5000.0, 0.0, 1.0))
                    else:
                        depth_score = 0.5
                    severity = _classify_pothole_severity(area_pct, depth_score)
                    detections.append({
                        "detection_id": str(uuid.uuid4())[:8].upper(),
                        "type": "pothole",
                        "confidence": round(confs[i], 3),
                        "lat": gps["lat"],
                        "long": gps["long"],
                        "frame_idx": frame_idx,
                        "bounding_box": [x1, y1, bw, bh],
                        "area_pct": round(area_pct, 3),
                        "depth_score": round(depth_score, 3),
                        **severity,
                    })
            return detections

        if self.pothole_model is None:
            return []

        results = self.pothole_model(frame, verbose=False, conf=self.confidence_threshold)
        detections = []

        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                bw = max(x2 - x1, 1)
                bh = max(y2 - y1, 1)
                area = bw * bh
                area_pct = (area / max(roi_area, 1)) * 100.0

                # Compute depth score using Laplacian edge variance in detected bounding box
                patch = gray[max(y1, 0):min(y2, h), max(x1, 0):min(x2, w)]
                if patch.size > 0:
                    laplacian = cv2.Laplacian(patch, cv2.CV_64F)
                    depth_score = float(np.clip(np.var(laplacian) / 5000.0, 0.0, 1.0))
                else:
                    depth_score = 0.5

                conf = float(box.conf[0])
                severity = _classify_pothole_severity(area_pct, depth_score)

                detections.append({
                    "detection_id": str(uuid.uuid4())[:8].upper(),
                    "type": "pothole",
                    "confidence": round(conf, 3),
                    "lat": gps["lat"],
                    "long": gps["long"],
                    "frame_idx": frame_idx,
                    "bounding_box": [x1, y1, bw, bh],
                    "area_pct": round(area_pct, 3),
                    "depth_score": round(depth_score, 3),
                    **severity,
                })

        return detections

    def _yolo_vehicle_detections(self, frame: np.ndarray) -> list[dict]:
        """Run YOLOv8 inference and extract vehicle bounding boxes."""
        if self.vehicle_model is None:
            return []
        results = self.vehicle_model(frame, verbose=False, conf=self.confidence_threshold)
        dets = []
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                if cls_id not in VEHICLE_CLASSES:
                    continue
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                dets.append({
                    "class_name": VEHICLE_CLASSES[cls_id],
                    "conf": float(box.conf[0]),
                    "bbox": [x1, y1, x2 - x1, y2 - y1],
                })
        return dets

    def analyze_frame(
        self,
        frame: np.ndarray,
        frame_idx: int,
        total_frames: int,
        fps: float,
        route: list[dict],
    ) -> dict:
        """
        Full analysis of one video frame.

        Returns
        -------
        dict with keys:
          - potholes : list of pothole detections with severity/GPS
          - vehicles : dict of active tracked vehicles with speed/rash info
          - annotated_frame : frame with bounding boxes drawn (numpy array)
        """
        annotated = frame.copy()
        gps = interpolate_gps(route, frame_idx, total_frames)

        # ── 1. Pothole Detection (Trained YOLOv8 with OpenCV Fallback) ──────
        potholes = self._yolo_pothole_detections(frame, frame_idx, total_frames, route)
        # ONLY fall back to OpenCV if no neural network model (ONNX or PyTorch) is loaded
        if not potholes and self.pothole_model is None and self.onnx_pothole_session is None:
            potholes = detect_potholes_opencv(
                frame, frame_idx, total_frames, route, self.confidence_threshold
            )

        # ── 2. Vehicle Detection (YOLOv8 or OpenCV fallback) ────────────────
        vehicle_dets = self._yolo_vehicle_detections(frame)

        # OpenCV fallback: background subtractor-based vehicle detection
        if not vehicle_dets:
            vehicle_dets = self._opencv_vehicle_fallback(frame)

        # ── 3. Update tracker ────────────────────────────────────────────────
        self.tracker.update(vehicle_dets, frame_idx, fps)

        # ── 4. Build vehicle alert list ──────────────────────────────────────
        vehicle_alerts = []
        for tid, track in self.tracker.tracks.items():
            if len(track.speeds_kmh) < 2:
                continue
            avg_spd = track.avg_speed_kmh
            max_spd = track.max_speed_kmh
            rash = track.rash_score
            is_speeding = max_spd > SPEED_LIMIT_KMPH
            is_rash = rash > RASH_LATERAL_THRESHOLD

            if not (is_speeding or is_rash):
                continue

            alert_type = (
                "rash_driving" if is_rash and is_speeding
                else "rash_driving" if is_rash
                else "speeding_vehicle"
            )
            vehicle_alerts.append({
                "track_id": tid,
                "type": alert_type,
                "class_name": track.class_name,
                "avg_speed_kmh": round(avg_spd, 1),
                "max_speed_kmh": round(max_spd, 1),
                "speed_limit_kmh": SPEED_LIMIT_KMPH,
                "rash_score": round(rash, 3),
                "is_speeding": is_speeding,
                "is_rash": is_rash,
                "lat": gps["lat"],
                "long": gps["long"],
                "frame_idx": frame_idx,
                "confidence": round(min(0.65 + rash * 0.3 + (max_spd / 120.0) * 0.05, 0.99), 3),
                "bbox": track.bboxes[-1] if track.bboxes else None,
            })

        # ── 5. Annotate frame ────────────────────────────────────────────────
        annotated = self._draw_annotations(annotated, potholes, vehicle_alerts, vehicle_dets)

        return {
            "frame_idx": frame_idx,
            "gps": gps,
            "potholes": potholes,
            "vehicle_alerts": vehicle_alerts,
            "annotated_frame": annotated,
        }

    def _opencv_vehicle_fallback(self, frame: np.ndarray) -> list[dict]:
        """
        Basic vehicle detection using OpenCV Haar cascade / contour detection
        when YOLOv8 is unavailable — for simulation/testing purposes.
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (21, 21), 0)
        _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        dets = []
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < 3000:
                continue
            x, y, w, h = cv2.boundingRect(cnt)
            aspect = w / max(h, 1)
            if 0.5 < aspect < 4.0:
                dets.append({
                    "class_name": "car",
                    "conf": 0.60,
                    "bbox": [x, y, w, h],
                })
        return dets[:6]  # cap at 6 for simulation

    def _draw_annotations(
        self,
        frame: np.ndarray,
        potholes: list[dict],
        vehicle_alerts: list[dict],
        vehicle_dets: list[dict],
    ) -> np.ndarray:
        """Draw bounding boxes, labels, severity badges, and speed overlays."""
        SEVERITY_COLORS = {1: (34, 197, 94), 2: (245, 158, 11), 3: (239, 68, 68)}
        SEVERITY_LABELS = {
            1: "Level-1 LOW",
            2: "Level-2 MEDIUM",
            3: "Level-3 CRITICAL!",
        }

        # ── Draw potholes ───────────────────────────────────────────────────
        for ph in potholes:
            x, y, w, h = ph["bounding_box"]
            lvl = ph["severity_level"]
            color = SEVERITY_COLORS[lvl]
            thickness = 1 + lvl
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, thickness)
            label = f"POTHOLE {SEVERITY_LABELS[lvl]} ({ph['confidence']*100:.0f}%)"
            cv2.putText(frame, label, (x, max(y - 8, 10)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.42, color, 1, cv2.LINE_AA)

        # ── Draw all detected vehicles (all detections) ──────────────────────
        for det in vehicle_dets:
            bx, by, bw, bh = det["bbox"]
            cv2.rectangle(frame, (bx, by), (bx + bw, by + bh), (180, 180, 180), 1)

        # ── Highlight speeding / rash vehicles ──────────────────────────────
        for va in vehicle_alerts:
            if va["bbox"] is None:
                continue
            bx, by, bw, bh = va["bbox"]
            color = (239, 68, 68) if va["is_rash"] else (245, 158, 11)
            cv2.rectangle(frame, (bx, by), (bx + bw, by + bh), color, 2)
            tag = (f"RASH {va['max_speed_kmh']:.0f}km/h" if va["is_rash"]
                   else f"SPEED {va['max_speed_kmh']:.0f}km/h")
            cv2.putText(frame, tag, (bx, max(by - 6, 10)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1, cv2.LINE_AA)

        # ── GPS watermark ────────────────────────────────────────────────────
        cv2.putText(frame, "UrbanEye AI | SIH-26124 | BEL",
                    (8, frame.shape[0] - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 212, 255), 1, cv2.LINE_AA)
        return frame


# ═════════════════════════════════════════════════════════════════════════════
def _extract_and_encode_pothole_patch(frame: np.ndarray, ph: dict) -> str:
    """
    Extracts a padded crop of the detected pothole from the video frame,
    annotates it with the detection bounding box and severity badge,
    and returns a compact base64-encoded JPEG Data URL.
    Also saves a local copy to disk for static inspection when running locally.
    """
    try:
        bx, by, bw, bh = ph["bounding_box"]
        fh, fw = frame.shape[:2]
        pad_x = max(int(bw * 0.7), 60)
        pad_y = max(int(bh * 0.7), 50)
        x1 = max(0, bx - pad_x)
        y1 = max(0, by - pad_y)
        x2 = min(fw, bx + bw + pad_x)
        y2 = min(fh, by + bh + pad_y)
        patch = frame[y1:y2, x1:x2].copy()
        if patch.size > 0:
            sev_colors = {1: (34, 197, 94), 2: (11, 158, 245), 3: (68, 68, 239)}  # BGR
            c = sev_colors.get(ph.get("severity_level", 2), (68, 68, 239))
            cv2.rectangle(patch, (bx - x1, by - y1), (bx + bw - x1, by + bh - y1), c, 2)
            lbl = f"POTHOLE L{ph.get('severity_level', 1)} {ph.get('confidence', 0.8)*100:.0f}%"
            cv2.putText(patch, lbl, (max(bx - x1, 4), max(by - y1 - 6, 16)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, c, 1, cv2.LINE_AA)

            # Limit max dimensions to 360px to keep payload compact (~12-25KB)
            max_dim = 360
            hp, wp = patch.shape[:2]
            if max(hp, wp) > max_dim:
                s = max_dim / max(hp, wp)
                enc_patch = cv2.resize(patch, (int(wp * s), int(hp * s)), interpolation=cv2.INTER_AREA)
            else:
                enc_patch = patch

            ok, buffer = cv2.imencode(".jpg", enc_patch, [cv2.IMWRITE_JPEG_QUALITY, 80])
            data_url = ""
            if ok:
                b64_img = base64.b64encode(buffer).decode("utf-8")
                data_url = f"data:image/jpeg;base64,{b64_img}"

            # Also write local disk copies for local inspection
            try:
                img_filename = f"pothole_{ph['detection_id']}.jpg"
                captures_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "captures")
                os.makedirs(captures_dir, exist_ok=True)
                cv2.imwrite(os.path.join(captures_dir, img_filename), patch, [cv2.IMWRITE_JPEG_QUALITY, 90])

                public_alerts_dir = os.path.join(
                    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                    "frontend", "public", "images", "alerts"
                )
                os.makedirs(public_alerts_dir, exist_ok=True)
                cv2.imwrite(os.path.join(public_alerts_dir, img_filename), patch, [cv2.IMWRITE_JPEG_QUALITY, 90])
            except Exception:
                pass

            if data_url:
                return data_url
            return f"/images/alerts/pothole_{ph['detection_id']}.jpg"
    except Exception as ex:
        logger.warning(f"Could not extract pothole crop: {ex}")

    return "/images/alerts/pothole.jpg"


# ═════════════════════════════════════════════════════════════════════════════
#  Video File Analysis Entry Point
# ═════════════════════════════════════════════════════════════════════════════

def analyze_video(
    video_bytes: bytes,
    route: list[dict],
    confidence_threshold: float = 0.50,
    sample_every_n_frames: int = 5,
    origin_bus_id: str = "VIDEO-UPLOAD",
) -> dict:
    """
    Full video file analysis pipeline.

    Parameters
    ----------
    video_bytes           : raw video file bytes
    route                 : list of {lat, long} GPS waypoints
    confidence_threshold  : minimum detection confidence
    sample_every_n_frames : process every Nth frame (for speed)
    origin_bus_id         : identifier tag for alerts

    Returns
    -------
    dict with full analysis results and aggregated alert list
    """
    import tempfile, os

    # Write to temp file because OpenCV needs a file path
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            return {"error": "Could not open video file. Please upload a valid MP4/AVI/MOV file."}

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
        duration_sec = total_frames / fps
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        analyzer = RoadVisionAnalyzer(confidence_threshold=confidence_threshold)
        all_potholes: list[dict] = []
        all_vehicle_alerts: list[dict] = []
        frame_results: list[dict] = []
        frame_idx = 0

        # Smart adaptive sampling: limit max analyzed frames to ~30 to ensure completion within 10s on Render
        max_samples = 30
        auto_step = max(1, total_frames // max_samples)
        effective_sample_step = max(sample_every_n_frames, auto_step)

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % effective_sample_step == 0:
                result = analyzer.analyze_frame(frame, frame_idx, total_frames, fps, route)
                timestamp_sec = round(frame_idx / max(fps, 1.0), 2)

                # Capture and store high-resolution snapshot picture of each detected pothole
                for ph in result["potholes"]:
                    ph["timestamp_sec"] = timestamp_sec
                    ph["frame_idx"] = frame_idx
                    ph["image_url"] = _extract_and_encode_pothole_patch(frame, ph)

                frame_results.append({
                    "frame_idx": frame_idx,
                    "timestamp_sec": timestamp_sec,
                    "gps": result["gps"],
                    "pothole_count": len(result["potholes"]),
                    "vehicle_alert_count": len(result["vehicle_alerts"]),
                })
                all_potholes.extend(result["potholes"])
                all_vehicle_alerts.extend(result["vehicle_alerts"])

            frame_idx += 1

        cap.release()
    finally:
        os.unlink(tmp_path)

    # Deduplicate similar potholes detected across nearby frames
    all_potholes = _deduplicate_potholes(all_potholes)

    # Convert to unified alert format for frontend + backend DB ingestion
    alerts = _to_alert_format(all_potholes, all_vehicle_alerts, origin_bus_id)

    # Severity summary
    sev_counts = {1: 0, 2: 0, 3: 0}
    for ph in all_potholes:
        sev_counts[ph["severity_level"]] += 1

    return {
        "video_info": {
            "fps": round(fps, 2),
            "total_frames": total_frames,
            "duration_sec": round(duration_sec, 2),
            "resolution": f"{w}x{h}",
            "frames_analyzed": len(frame_results),
        },
        "summary": {
            "total_potholes": len(all_potholes),
            "severity_level_1": sev_counts[1],
            "severity_level_2": sev_counts[2],
            "severity_level_3": sev_counts[3],
            "total_vehicle_alerts": len(all_vehicle_alerts),
            "speeding_count": sum(1 for v in all_vehicle_alerts if v["type"] == "speeding_vehicle"),
            "rash_driving_count": sum(1 for v in all_vehicle_alerts if v["type"] == "rash_driving"),
        },
        "potholes": all_potholes,
        "vehicle_alerts": all_vehicle_alerts,
        "alerts": alerts,                    # unified format ready for DB ingest
        "frame_timeline": frame_results,
    }


def _deduplicate_potholes(potholes: list[dict], min_distance_m: float = 8.0) -> list[dict]:
    """Remove near-duplicate potholes detected across consecutive frames."""
    unique = []
    for ph in potholes:
        is_dup = False
        for u in unique:
            # Haversine check
            R = 6371000.0
            lat1, lat2 = math.radians(ph["lat"]), math.radians(u["lat"])
            dlat = math.radians(u["lat"] - ph["lat"])
            dlon = math.radians(u["long"] - ph["long"])
            a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
            dist = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            if dist < min_distance_m and ph["severity_level"] == u["severity_level"]:
                is_dup = True
                # Keep the one with higher confidence
                if ph["confidence"] > u["confidence"]:
                    u.update(ph)
                break
        if not is_dup:
            unique.append(ph)
    return unique


def _to_alert_format(potholes: list[dict], vehicle_alerts: list[dict], bus_id: str) -> list[dict]:
    """Convert raw detections to UrbanEye AlertCreate-compatible format."""
    alerts = []
    now = datetime.now(timezone.utc).isoformat()

    for ph in potholes:
        alerts.append({
            "id": f"VID-{ph['detection_id']}",
            "type": "pothole",
            "confidence": ph["confidence"],
            "lat": ph["lat"],
            "long": ph["long"],
            "timestamp": now,
            "bus_id": bus_id,
            "status": "open",
            "meta": {
                "verified_by_bus_count": 1,
                "severity_level": ph["severity_level"],
                "severity_label": ph["severity_label"],
                "action_required": ph["action_required"],
                "area_pct": ph["area_pct"],
                "depth_score": ph["depth_score"],
                "bounding_box": ph["bounding_box"],
                "color": ph["color"],
                "image_url": ph.get("image_url", "/images/alerts/pothole.jpg"),
                "timestamp_sec": ph.get("timestamp_sec", 0.0),
                "frame_idx": ph.get("frame_idx", 0),
            },
        })


    for va in vehicle_alerts:
        alerts.append({
            "id": f"VEH-{str(uuid.uuid4())[:8].upper()}",
            "type": va["type"],
            "confidence": va["confidence"],
            "lat": va["lat"],
            "long": va["long"],
            "timestamp": now,
            "bus_id": bus_id,
            "status": "open",
            "meta": {
                "verified_by_bus_count": 1,
                "speed_kmh": va["max_speed_kmh"],
                "speed_limit_kmh": va["speed_limit_kmh"],
                "rash_score": va["rash_score"],
                "vehicle_class": va["class_name"],
                "action_required": (
                    "🚨 Rash Driving Detected — Notify Traffic Authority"
                    if va["is_rash"]
                    else f"⚠️ Speeding {va['max_speed_kmh']:.0f} km/h — Issue challan"
                ),
            },
        })

    return alerts


_SHARED_ANALYZER: Optional["RoadVisionAnalyzer"] = None

def get_shared_analyzer(confidence_threshold: float = 0.50) -> "RoadVisionAnalyzer":
    global _SHARED_ANALYZER
    if _SHARED_ANALYZER is None:
        _SHARED_ANALYZER = RoadVisionAnalyzer(confidence_threshold=confidence_threshold)
    return _SHARED_ANALYZER

def analyze_single_frame(
    frame_bytes: bytes,
    route: list[dict],
    frame_idx: int = 0,
    total_frames: int = 100,
    fps: float = 25.0,
    confidence_threshold: float = 0.50,
    bus_id: str = "LIVE-CAM",
    analyzer: Optional["RoadVisionAnalyzer"] = None,
) -> dict:
    """
    Analyze a single frame (for live camera mode).

    Returns structured detections in UrbanEye alert format with annotated JPEG.
    """
    nparr = np.frombuffer(frame_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        return {"error": "Invalid frame data"}

    if analyzer is None:
        analyzer = get_shared_analyzer(confidence_threshold=confidence_threshold)

    result = analyzer.analyze_frame(frame, frame_idx, total_frames, fps, route)

    # Extract and encode pothole crops
    for ph in result["potholes"]:
        ph["image_url"] = _extract_and_encode_pothole_patch(frame, ph)

    # Encode annotated frame as base64 JPEG for frontend display
    _, jpeg_buf = cv2.imencode(".jpg", result["annotated_frame"], [cv2.IMWRITE_JPEG_QUALITY, 82])
    annotated_b64 = base64.b64encode(jpeg_buf.tobytes()).decode("utf-8")

    alerts = _to_alert_format(result["potholes"], result["vehicle_alerts"], bus_id)

    return {
        "frame_idx": frame_idx,
        "gps": result["gps"],
        "potholes": result["potholes"],
        "vehicle_alerts": result["vehicle_alerts"],
        "alerts": alerts,
        "annotated_frame_b64": annotated_b64,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
