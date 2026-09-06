/**
 * Mock data module — simulates backend REST API responses.
 * To switch to a real backend, set VITE_USE_MOCK=false in .env
 * and ensure VITE_API_BASE_URL points to the real API.
 * All data shape matches the backend contract in src/types/index.ts
 */

import type { Alert, AnalyticsSummary, HeatmapPoint, RouteReplay } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const iso = (minutesAgo: number) => {
  const d = new Date(Date.now() - minutesAgo * 60 * 1000);
  return d.toISOString();
};

// Delhi road coords (realistic cluster around Connaught Place & surroundings)
const DELHI_COORDS = [
  { lat: 28.6315, long: 77.2167 }, // Connaught Place
  { lat: 28.6328, long: 77.2195 },
  { lat: 28.6139, long: 77.2090 }, // India Gate
  { lat: 28.6080, long: 77.2100 },
  { lat: 28.6450, long: 77.2010 }, // Civil Lines
  { lat: 28.6530, long: 77.2215 },
  { lat: 28.6270, long: 77.2300 }, // Mandi House
  { lat: 28.6200, long: 77.2240 },
  { lat: 28.6380, long: 77.2400 }, // ITO
  { lat: 28.6500, long: 77.2550 }, // Laxmi Nagar
  { lat: 28.6050, long: 77.1950 }, // Sarojini Nagar
  { lat: 28.5990, long: 77.2060 },
  { lat: 28.6600, long: 77.2300 }, // Kashmere Gate
  { lat: 28.6180, long: 77.2420 }, // Pragati Maidan
  { lat: 28.6420, long: 77.1920 }, // Dhaula Kuan
  { lat: 28.6560, long: 77.2450 },
  { lat: 28.6250, long: 77.2120 },
  { lat: 28.6160, long: 77.2010 },
];

const c = (i: number) => DELHI_COORDS[i % DELHI_COORDS.length];

// ─── Mock alerts ─────────────────────────────────────────────────────────────

export const MOCK_ALERTS: Alert[] = [
  {
    id: 'ALT-001',
    type: 'incident_hit_and_run',
    confidence: 0.94,
    ...c(0),
    long: c(0).long,
    timestamp: iso(3),
    bus_id: 'BUS-042',
    status: 'open',
    meta: { plate_number: 'DL 4C AB 2381', verified_by_bus_count: 1 },
  },
  {
    id: 'ALT-002',
    type: 'pothole',
    confidence: 0.91,
    ...c(1),
    long: c(1).long,
    timestamp: iso(7),
    bus_id: 'BUS-017',
    status: 'open',
    meta: { verified_by_bus_count: 3 },
  },
  {
    id: 'ALT-003',
    type: 'bottleneck',
    confidence: 0.87,
    ...c(2),
    long: c(2).long,
    timestamp: iso(12),
    bus_id: 'BUS-031',
    status: 'acknowledged',
    meta: { vehicle_count: 148 },
  },
  {
    id: 'ALT-004',
    type: 'pedestrian_risk',
    confidence: 0.89,
    ...c(3),
    long: c(3).long,
    timestamp: iso(15),
    bus_id: 'BUS-009',
    status: 'open',
    meta: { verified_by_bus_count: 2 },
  },
  {
    id: 'ALT-005',
    type: 'waterlogging',
    confidence: 0.88,
    ...c(4),
    long: c(4).long,
    timestamp: iso(20),
    bus_id: 'BUS-024',
    status: 'open',
    meta: {},
  },
  {
    id: 'ALT-006',
    type: 'missing_signboard',
    confidence: 0.76,
    ...c(5),
    long: c(5).long,
    timestamp: iso(28),
    bus_id: 'BUS-011',
    status: 'open',
    meta: { verified_by_bus_count: 1 },
  },
  {
    id: 'ALT-007',
    type: 'vehicle_density',
    confidence: 0.95,
    ...c(6),
    long: c(6).long,
    timestamp: iso(35),
    bus_id: 'BUS-038',
    status: 'acknowledged',
    meta: { vehicle_count: 212 },
  },
  {
    id: 'ALT-008',
    type: 'incident_hit_and_run',
    confidence: 0.83,
    ...c(7),
    long: c(7).long,
    timestamp: iso(42),
    bus_id: 'BUS-055',
    status: 'resolved',
    meta: { plate_number: 'HR 26 BK 7790', verified_by_bus_count: 2 },
  },
  {
    id: 'ALT-009',
    type: 'missing_crossing',
    confidence: 0.81,
    ...c(8),
    long: c(8).long,
    timestamp: iso(50),
    bus_id: 'BUS-003',
    status: 'open',
    meta: {},
  },
  {
    id: 'ALT-010',
    type: 'pothole',
    confidence: 0.96,
    ...c(9),
    long: c(9).long,
    timestamp: iso(58),
    bus_id: 'BUS-021',
    status: 'open',
    meta: { verified_by_bus_count: 4 },
  },
  {
    id: 'ALT-011',
    type: 'bottleneck',
    confidence: 0.92,
    ...c(10),
    long: c(10).long,
    timestamp: iso(65),
    bus_id: 'BUS-047',
    status: 'open',
    meta: { vehicle_count: 187 },
  },
  {
    id: 'ALT-012',
    type: 'pedestrian_risk',
    confidence: 0.78,
    ...c(11),
    long: c(11).long,
    timestamp: iso(80),
    bus_id: 'BUS-012',
    status: 'resolved',
    meta: { verified_by_bus_count: 1 },
  },
  {
    id: 'ALT-013',
    type: 'waterlogging',
    confidence: 0.85,
    ...c(12),
    long: c(12).long,
    timestamp: iso(90),
    bus_id: 'BUS-033',
    status: 'open',
    meta: {},
  },
  {
    id: 'ALT-014',
    type: 'pothole',
    confidence: 0.90,
    ...c(13),
    long: c(13).long,
    timestamp: iso(110),
    bus_id: 'BUS-019',
    status: 'acknowledged',
    meta: { verified_by_bus_count: 2 },
  },
  {
    id: 'ALT-015',
    type: 'missing_signboard',
    confidence: 0.73,
    ...c(14),
    long: c(14).long,
    timestamp: iso(130),
    bus_id: 'BUS-006',
    status: 'open',
    meta: {},
  },
  {
    id: 'ALT-016',
    type: 'incident_hit_and_run',
    confidence: 0.97,
    ...c(15),
    long: c(15).long,
    timestamp: iso(145),
    bus_id: 'BUS-028',
    status: 'open',
    meta: { plate_number: 'UP 32 DT 4412', verified_by_bus_count: 3 },
  },
  {
    id: 'ALT-017',
    type: 'vehicle_density',
    confidence: 0.88,
    ...c(16),
    long: c(16).long,
    timestamp: iso(160),
    bus_id: 'BUS-051',
    status: 'open',
    meta: { vehicle_count: 95 },
  },
  {
    id: 'ALT-018',
    type: 'missing_crossing',
    confidence: 0.82,
    ...c(17),
    long: c(17).long,
    timestamp: iso(200),
    bus_id: 'BUS-007',
    status: 'open',
    meta: { verified_by_bus_count: 1 },
  },
];

// ─── Analytics summary ───────────────────────────────────────────────────────

export const MOCK_SUMMARY: AnalyticsSummary = {
  open_defects: 127,
  active_incidents: 8,
  avg_route_delay_min: 4.2,
  buses_reporting: 42,
  bandwidth_saved_pct: 99.97,
  total_alerts_today: 183,
};

// ─── Heatmap points ──────────────────────────────────────────────────────────

export const MOCK_HEATMAP: HeatmapPoint[] = [
  ...DELHI_COORDS.map((coord, _i) => ({
    lat: coord.lat + (Math.random() - 0.5) * 0.005,
    long: coord.long + (Math.random() - 0.5) * 0.005,
    weight: 0.4 + Math.random() * 0.6,
  })),
  // Cluster around Connaught Place for visual drama
  ...Array.from({ length: 12 }, (_, _i) => ({
    lat: 28.6315 + (Math.random() - 0.5) * 0.012,
    long: 77.2167 + (Math.random() - 0.5) * 0.012,
    weight: 0.7 + Math.random() * 0.3,
  })),
  // Cluster near ITO
  ...Array.from({ length: 8 }, () => ({
    lat: 28.6380 + (Math.random() - 0.5) * 0.008,
    long: 77.2400 + (Math.random() - 0.5) * 0.008,
    weight: 0.5 + Math.random() * 0.5,
  })),
];

// ─── Route replay ────────────────────────────────────────────────────────────

const makeReplayPoints = (startLat: number, startLng: number, count: number) =>
  Array.from({ length: count }, (_, i) => ({
    lat: startLat + i * 0.0008 + (Math.random() - 0.5) * 0.0003,
    long: startLng + i * 0.0012 + (Math.random() - 0.5) * 0.0003,
    timestamp: iso(60 - i * (60 / count)),
    speed_kmh: 15 + Math.random() * 25,
  }));

export const MOCK_ROUTES: RouteReplay[] = [
  {
    bus_id: 'BUS-042',
    route_name: 'Route 34 — CP to Kashmere Gate',
    points: makeReplayPoints(28.6139, 77.2090, 60),
    alerts: MOCK_ALERTS.filter((a) => a.bus_id === 'BUS-042'),
  },
  {
    bus_id: 'BUS-017',
    route_name: 'Route 12 — Sarojini to ITO',
    points: makeReplayPoints(28.5990, 77.2060, 50),
    alerts: MOCK_ALERTS.filter((a) => a.bus_id === 'BUS-017'),
  },
];

// ─── Fleet bus positions (simulated live) ─────────────────────────────────────

export const MOCK_FLEET = Array.from({ length: 42 }, (_, i) => ({
  bus_id: `BUS-${String(i + 1).padStart(3, '0')}`,
  lat: 28.58 + Math.random() * 0.1,
  long: 77.17 + Math.random() * 0.12,
  route: `Route ${Math.floor(Math.random() * 50) + 1}`,
  speed_kmh: Math.floor(Math.random() * 40) + 5,
  last_seen: iso(Math.floor(Math.random() * 3)),
}));

// ─── Vehicle density time-series (for charts) ─────────────────────────────────

export const MOCK_DENSITY_SERIES = Array.from({ length: 24 }, (_, h) => ({
  hour: `${String(h).padStart(2, '0')}:00`,
  count: h >= 7 && h <= 10 ? 180 + Math.random() * 60
       : h >= 17 && h <= 20 ? 160 + Math.random() * 80
       : h >= 23 || h <= 5  ? 20 + Math.random() * 30
       : 60 + Math.random() * 80,
}));

// ─── Defect type distribution ─────────────────────────────────────────────────

export const MOCK_DEFECT_DISTRIBUTION = [
  { name: 'Potholes',          value: 41, color: '#f97316' },
  { name: 'Bottlenecks',       value: 28, color: '#f59e0b' },
  { name: 'Waterlogging',      value: 17, color: '#3b82f6' },
  { name: 'Pedestrian Risk',   value: 22, color: '#00d4ff' },
  { name: 'Incidents',         value: 8,  color: '#ef4444' },
  { name: 'Missing Signboard', value: 11, color: '#8b5cf6' },
  { name: 'Missing Crossing',  value: 9,  color: '#06b6d4' },
];

// ─── Route delay data ─────────────────────────────────────────────────────────

export const MOCK_ROUTE_DELAYS = [
  { route: 'Rt-34', scheduled: 45, actual: 51, delay: 6 },
  { route: 'Rt-12', scheduled: 38, actual: 42, delay: 4 },
  { route: 'Rt-07', scheduled: 55, actual: 57, delay: 2 },
  { route: 'Rt-21', scheduled: 40, actual: 47, delay: 7 },
  { route: 'Rt-15', scheduled: 32, actual: 33, delay: 1 },
  { route: 'Rt-09', scheduled: 50, actual: 60, delay: 10 },
];
