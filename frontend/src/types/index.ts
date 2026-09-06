// ─── Alert types (matches backend contract) ─────────────────────────────────

export type AlertType =
  | 'pothole'
  | 'waterlogging'
  | 'missing_signboard'
  | 'missing_crossing'
  | 'vehicle_density'
  | 'bottleneck'
  | 'pedestrian_risk'
  | 'incident_hit_and_run';

export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export interface AlertMeta {
  plate_number?: string;
  vehicle_count?: number;
  verified_by_bus_count?: number;
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

// ─── Route replay ────────────────────────────────────────────────────────────

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

// ─── UI state types ──────────────────────────────────────────────────────────

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
export type DashboardPage = 'dashboard' | 'incidents' | 'analytics' | 'fleet';

// ─── Replay state ─────────────────────────────────────────────────────────────

export type PlaybackSpeed = 1 | 2 | 4;

export interface ReplayState {
  isPlaying: boolean;
  currentTime: number; // seconds from start
  totalDuration: number; // seconds
  speed: PlaybackSpeed;
  busId: string | null;
}
