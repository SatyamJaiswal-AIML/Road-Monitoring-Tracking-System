from pydantic import BaseModel, Field
from typing import Optional, Literal
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
    "incident_hit_and_run"
]

AlertStatus = Literal["open", "acknowledged", "resolved"]

class AlertMeta(BaseModel):
    plate_number: Optional[str] = Field(default=None, description="Extracted license plate for incident type")
    vehicle_count: Optional[int] = Field(default=None, description="Vehicle count for density/bottleneck types")
    verified_by_bus_count: Optional[int] = Field(default=1, description="Server-managed count of independent confirmations")

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
