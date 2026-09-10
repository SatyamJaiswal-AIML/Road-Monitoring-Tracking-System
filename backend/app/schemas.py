from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import datetime
import uuid

AlertType = Literal[
    "pothole",
    "waterlogging",
    "missing_signboard",
    "missing_crossing",
    "vehicle_density",
    "bottleneck",
    "pedestrian_risk",
    "incident_hit_and_run",
    # ── New alert types added for Video/Camera analysis pipeline ──
    "speeding_vehicle",
    "rash_driving",
]

AlertStatus = Literal["open", "acknowledged", "resolved"]

# 3-Level Pothole Severity (SIH-26124 spec)
SeverityLevel = Literal[1, 2, 3]


class AlertMeta(BaseModel):
    # ── Existing fields ──────────────────────────────────────────────────────
    plate_number: Optional[str] = Field(default=None, description="Extracted license plate for incident type")
    vehicle_count: Optional[int] = Field(default=None, description="Vehicle count for density/bottleneck types")
    verified_by_bus_count: Optional[int] = Field(default=1, description="Server-managed count of independent confirmations")
    image_url: Optional[str] = Field(default=None, description="Edge AI snapshot camera URL")

    # ── Video / Vision Engine fields ─────────────────────────────────────────
    # Pothole severity fields
    severity_level: Optional[SeverityLevel] = Field(
        default=None,
        description="Pothole severity: 1=Low, 2=Medium, 3=Critical/Immediate Action"
    )
    severity_label: Optional[str] = Field(
        default=None,
        description="Human-readable severity label e.g. 'Critical'"
    )
    action_required: Optional[str] = Field(
        default=None,
        description="Recommended action text for the detected defect/incident"
    )
    area_pct: Optional[float] = Field(
        default=None,
        description="Pothole bounding-box area as percentage of road ROI area"
    )
    depth_score: Optional[float] = Field(
        default=None,
        description="Depth proxy score derived from Laplacian edge variance (0–1)"
    )
    color: Optional[str] = Field(
        default=None,
        description="Hex color code for this detection (for Leaflet marker rendering)"
    )
    bounding_box: Optional[List[int]] = Field(
        default=None,
        description="[x, y, width, height] bounding box in frame pixel coordinates"
    )

    # Vehicle speed / rash driving fields
    speed_kmh: Optional[float] = Field(
        default=None,
        description="Estimated vehicle speed in km/h"
    )
    speed_limit_kmh: Optional[float] = Field(
        default=None,
        description="Speed limit threshold used for classification"
    )
    rash_score: Optional[float] = Field(
        default=None,
        description="Rash driving lateral swerve score (0–1, higher = more rash)"
    )
    vehicle_class: Optional[str] = Field(
        default=None,
        description="Detected vehicle type: car, bus, truck, motorcycle"
    )

    # Source info
    source: Optional[str] = Field(
        default=None,
        description="Detection source: 'edge_stream', 'video_upload', 'live_camera'"
    )


class AlertCreate(BaseModel):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    type: AlertType
    confidence: float = Field(ge=0.0, le=1.0)
    lat: float = Field(ge=-90.0, le=90.0)
    long: float = Field(ge=-180.0, le=180.0)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    bus_id: str
    meta: Optional[AlertMeta] = Field(default_factory=AlertMeta)


class AlertResponse(BaseModel):
    id: str
    type: AlertType
    confidence: float
    lat: float
    long: float
    timestamp: datetime
    bus_id: str
    status: AlertStatus = "open"
    meta: AlertMeta

    class Config:
        from_attributes = True


class AlertStatusUpdate(BaseModel):
    status: AlertStatus


class AnalyticsSummary(BaseModel):
    buses_reporting: int
    open_defects: int
    active_incidents: int
    avg_route_delay_min: float
    bandwidth_saved_pct: float
    total_alerts_today: int = 0


class GPSPoint(BaseModel):
    lat: float
    long: float
    timestamp_offset_sec: Optional[float] = None


# ─── Video Analysis Schemas ───────────────────────────────────────────────────

class VideoAnalysisRequest(BaseModel):
    bus_id: Optional[str] = Field(default="VIDEO-UPLOAD", description="Bus or device identifier")
    confidence_threshold: Optional[float] = Field(default=0.50, ge=0.1, le=0.99)
    sample_every_n_frames: Optional[int] = Field(default=5, ge=1, le=30, description="Process every Nth frame")
    # Route waypoints; if omitted the backend uses a default Delhi route
    route: Optional[List[GPSPoint]] = Field(default=None, description="GPS route waypoints")


class PotholeDetection(BaseModel):
    detection_id: str
    type: Literal["pothole"] = "pothole"
    confidence: float
    lat: float
    long: float
    frame_idx: int
    bounding_box: List[int]   # [x, y, w, h]
    area_pct: float
    depth_score: float
    severity_level: SeverityLevel
    severity_label: str
    action_required: str
    color: str
    image_url: Optional[str] = None
    timestamp_sec: Optional[float] = None



class VehicleAlertDetection(BaseModel):
    track_id: int
    type: Literal["speeding_vehicle", "rash_driving"]
    class_name: str
    avg_speed_kmh: float
    max_speed_kmh: float
    speed_limit_kmh: float
    rash_score: float
    is_speeding: bool
    is_rash: bool
    lat: float
    long: float
    frame_idx: int
    confidence: float
    bbox: Optional[List[int]] = None


class FrameTimelinePoint(BaseModel):
    frame_idx: int
    timestamp_sec: float
    gps: GPSPoint
    pothole_count: int
    vehicle_alert_count: int


class VideoAnalysisSummary(BaseModel):
    total_potholes: int
    severity_level_1: int
    severity_level_2: int
    severity_level_3: int
    total_vehicle_alerts: int
    speeding_count: int
    rash_driving_count: int


class VideoInfo(BaseModel):
    fps: float
    total_frames: int
    duration_sec: float
    resolution: str
    frames_analyzed: int


class VideoAnalysisResponse(BaseModel):
    video_info: VideoInfo
    summary: VideoAnalysisSummary
    potholes: List[dict]
    vehicle_alerts: List[dict]
    alerts: List[dict]        # UrbanEye unified alert format (ready for DB ingest)
    frame_timeline: List[dict]


class LiveFrameAnalysisResponse(BaseModel):
    frame_idx: int
    gps: dict
    potholes: List[dict]
    vehicle_alerts: List[dict]
    alerts: List[dict]
    annotated_frame_b64: str   # Base64-encoded JPEG for frontend <img> display
    timestamp: str
