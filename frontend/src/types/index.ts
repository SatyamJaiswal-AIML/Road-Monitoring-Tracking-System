// ─── Alert types (matches backend contract) ──────────────────────────────────

export type AlertType =
  | 'pothole'
  | 'waterlogging'
  | 'missing_signboard'
  | 'missing_crossing'
  | 'vehicle_density'
  | 'bottleneck'
  | 'pedestrian_risk'
  | 'incident_hit_and_run'
  // New types from Edge-AI Video/Camera pipeline
  | 'speeding_vehicle'
  | 'rash_driving';

export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

/** 1 = Low, 2 = Medium, 3 = Critical/Immediate */
export type SeverityLevel = 1 | 2 | 3;

export interface AlertMeta {
  plate_number?: string;
  vehicle_count?: number;
  verified_by_bus_count?: number;
  image_url?: string;
  repaired_image_url?: string;
  repaired_timestamp?: string;
  repaired_by_contractor?: string;
  repaired_verified_by_bus?: string;
  pci_impact_score?: number;

  // Pothole severity fields (from Video/Camera analysis)
  severity_level?: SeverityLevel;
  severity_label?: string;
  action_required?: string;
  area_pct?: number;
  depth_score?: number;
  color?: string;
  bounding_box?: [number, number, number, number]; // [x, y, w, h]

  // Vehicle speed / rash driving fields
  speed_kmh?: number;
  speed_limit_kmh?: number;
  rash_score?: number;
  vehicle_class?: string;

  // Source metadata
  source?: 'edge_stream' | 'video_upload' | 'live_camera';
}


export interface Alert {
  id: string;
  type: AlertType;
  confidence: number;
  lat: number;
  long: number;
  timestamp: string; // ISO 8601
  bus_id: string;
  status: AlertStatus;
  meta: AlertMeta;
  image_url?: string;
}

// ─── Pavement Condition Index (PCI) Corridor ────────────────────────────────

export interface CorridorPCI {
  id: string;
  name: string;
  corridor: string;
  pci: number; // 0 to 100
  status: 'good' | 'fair' | 'poor' | 'critical';
  defectCount: number;
  lengthKm: number;
  tripsPerDay: number;
  primaryDefect: string;
  lastInspected: string;
  recommendedAction: string;
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────

export interface HeatmapPoint {
  lat: number;
  long: number;
  weight: number;
}

// ─── Analytics summary ───────────────────────────────────────────────────────

export interface AnalyticsSummary {
  open_defects: number;
  active_incidents: number;
  avg_route_delay_min: number;
  buses_reporting: number;
  bandwidth_saved_pct: number;
  total_alerts_today: number;
}

// ─── Route replay ─────────────────────────────────────────────────────────────

export interface ReplayPoint {
  lat: number;
  long: number;
  timestamp: string; // ISO 8601
  speed_kmh: number;
}

export interface RouteReplay {
  bus_id: string;
  route_name: string;
  points: ReplayPoint[];
  alerts: Alert[]; // alerts that occurred during this route, sorted by timestamp
}

// ─── UI state types ───────────────────────────────────────────────────────────

export type FilterType = AlertType | 'all';

export interface DateRange {
  since: string | null;
  until: string | null;
}

export interface MapBounds {
  min_lat: number;
  max_lat: number;
  min_long: number;
  max_long: number;
}

export type MapView = 'markers' | 'heatmap';
export type DashboardPage = 'dashboard' | 'incidents' | 'analytics' | 'fleet' | 'video';

// ─── Replay state ─────────────────────────────────────────────────────────────

export type PlaybackSpeed = 1 | 2 | 4;

export interface ReplayState {
  isPlaying: boolean;
  currentTime: number; // seconds from start
  totalDuration: number; // seconds
  speed: PlaybackSpeed;
  busId: string | null;
}

// ─── Video / Camera Analysis Types (NEW) ─────────────────────────────────────

export interface PotholeDetection {
  detection_id: string;
  type: 'pothole';
  confidence: number;
  lat: number;
  long: number;
  frame_idx: number;
  bounding_box: [number, number, number, number];
  area_pct: number;
  depth_score: number;
  severity_level: SeverityLevel;
  severity_label: string;
  action_required: string;
  color: string;
  image_url?: string;
  timestamp_sec?: number;
}


export interface VehicleAlertDetection {
  track_id: number;
  type: 'speeding_vehicle' | 'rash_driving';
  class_name: string;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  speed_limit_kmh: number;
  rash_score: number;
  is_speeding: boolean;
  is_rash: boolean;
  lat: number;
  long: number;
  frame_idx: number;
  confidence: number;
  bbox?: [number, number, number, number] | null;
}

export interface VideoInfo {
  fps: number;
  total_frames: number;
  duration_sec: number;
  resolution: string;
  frames_analyzed: number;
}

export interface VideoAnalysisSummary {
  total_potholes: number;
  severity_level_1: number;
  severity_level_2: number;
  severity_level_3: number;
  total_vehicle_alerts: number;
  speeding_count: number;
  rash_driving_count: number;
}

export interface FrameTimelinePoint {
  frame_idx: number;
  timestamp_sec: number;
  gps: { lat: number; long: number };
  pothole_count: number;
  vehicle_alert_count: number;
}

export interface VideoAnalysisResult {
  video_info: VideoInfo;
  summary: VideoAnalysisSummary;
  potholes: PotholeDetection[];
  vehicle_alerts: VehicleAlertDetection[];
  alerts: Alert[];
  frame_timeline: FrameTimelinePoint[];
  db_ingested_count?: number;
}

export interface LiveFrameResult {
  frame_idx: number;
  gps: { lat: number; long: number };
  potholes: PotholeDetection[];
  vehicle_alerts: VehicleAlertDetection[];
  alerts: Alert[];
  annotated_frame_b64: string;
  timestamp: string;
}
