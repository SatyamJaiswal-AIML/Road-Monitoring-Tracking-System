/**
 * Mock data module — simulates backend REST API responses.
 * To switch to a real backend, set VITE_USE_MOCK=false in .env
 * and ensure VITE_API_BASE_URL points to the real API.
 * All data shape matches the backend contract in src/types/index.ts
 */

import type { Alert, AnalyticsSummary, HeatmapPoint, RouteReplay, CorridorPCI } from '../types';

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

// ─── Mock alerts ─────────────────────────────────────────────────────────────

export const MOCK_ALERTS: Alert[] = [
  {
    id: 'ALT-PWD-001',
    type: 'pothole',
    confidence: 0.94,
    lat: 28.6728,
    long: 77.0945,
    timestamp: iso(7),
    bus_id: 'DTC-4102',
    status: 'open',
    meta: {
      plate_number: undefined,
      verified_by_bus_count: 4,

    },
  },
  {
    id: 'ALT-PWD-002',
    type: 'waterlogging',
    confidence: 0.91,
    lat: 28.5140,
    long: 77.3010,
    timestamp: iso(15),
    bus_id: 'DTC-1824',
    status: 'open',
    meta: {
      verified_by_bus_count: 3,

    },
  },
  {
    id: 'ALT-PWD-003',
    type: 'pothole',
    confidence: 0.89,
    lat: 28.6315,
    long: 77.2167,
    timestamp: iso(22),
    bus_id: 'DTC-3011',
    status: 'open',
    meta: {
      verified_by_bus_count: 2,

    },
  },
  {
    id: 'ALT-PWD-004',
    type: 'missing_signboard',
    confidence: 0.82,
    lat: 28.6380,
    long: 77.2400,
    timestamp: iso(30),
    bus_id: 'DTC-0921',
    status: 'open',
    meta: {
      verified_by_bus_count: 1,

    },
  },
  {
    id: 'ALT-PWD-005',
    type: 'vehicle_density',
    confidence: 0.96,
    lat: 28.7240,
    long: 77.1420,
    timestamp: iso(35),
    bus_id: 'DTC-5520',
    status: 'acknowledged',
    meta: {
      vehicle_count: 68,

    },
  },
  {
    id: 'ALT-PWD-006',
    type: 'bottleneck',
    confidence: 0.87,
    lat: 28.5280,
    long: 77.2190,
    timestamp: iso(45),
    bus_id: 'DTC-2219',
    status: 'open',
    meta: {
      vehicle_count: 42,

    },
  },
  {
    id: 'ALT-PWD-007',
    type: 'incident_hit_and_run',
    confidence: 0.95,
    lat: 28.5420,
    long: 77.1260,
    timestamp: iso(4),
    bus_id: 'DTC-0442',
    status: 'open',
    meta: {
      plate_number: 'DL 1C AB 4920',

    },
  },
  {
    id: 'ALT-PWD-008',
    type: 'missing_crossing',
    confidence: 0.84,
    lat: 28.6180,
    long: 77.2420,
    timestamp: iso(50),
    bus_id: 'DTC-1108',
    status: 'open',
    meta: {
      verified_by_bus_count: 3,

    },
  },
  {
    id: 'ALT-PWD-009',
    type: 'pedestrian_risk',
    confidence: 0.88,
    lat: 28.6530,
    long: 77.2300,
    timestamp: iso(58),
    bus_id: 'DTC-3401',
    status: 'open',
    meta: {
      verified_by_bus_count: 2,

    },
  },
  {
    id: 'ALT-PWD-010',
    type: 'pothole',
    confidence: 0.93,
    lat: 28.6850,
    long: 77.2100,
    timestamp: iso(65),
    bus_id: 'DTC-1940',
    status: 'resolved',
    meta: {
      verified_by_bus_count: 5,
      repaired_timestamp: iso(14),
      repaired_by_contractor: 'M/s Delhi PWD Zone-2 Concessionaire',
      repaired_verified_by_bus: 'DTC-1940',
      pci_impact_score: 96,
    },
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

// ─── Pavement Condition Index (PCI) Corridors (ASTM D6433 / IRC:SP:16) ────────

export const MOCK_CORRIDORS_PCI: CorridorPCI[] = [
  {
    id: 'COR-01',
    name: 'Outer Ring Road (Munirka - Dhaula Kuan)',
    corridor: 'Outer Ring Road',
    pci: 89,
    status: 'good',
    defectCount: 3,
    lengthKm: 14.2,
    tripsPerDay: 480,
    primaryDefect: 'Minor Transverse Cracks',
    lastInspected: '22m ago (DTC-4102)',
    recommendedAction: 'Routine Sweeping & Preventive Joint Sealing',
  },
  {
    id: 'COR-02',
    name: 'Ring Road (AIIMS - Moti Bagh Corridor)',
    corridor: 'Ring Road',
    pci: 84,
    status: 'good',
    defectCount: 5,
    lengthKm: 11.8,
    tripsPerDay: 620,
    primaryDefect: 'Faded Lane Markings',
    lastInspected: '14m ago (DTC-1824)',
    recommendedAction: 'Retroreflective Thermoplastic Remarking',
  },
  {
    id: 'COR-03',
    name: 'Vikas Marg (ITO - Laxmi Nagar Corridor)',
    corridor: 'Vikas Marg',
    pci: 67,
    status: 'fair',
    defectCount: 14,
    lengthKm: 6.4,
    tripsPerDay: 390,
    primaryDefect: 'Damaged Signboards & Water Ponding',
    lastInspected: '35m ago (DTC-0921)',
    recommendedAction: 'Drainage Clearing & Cold Mix Patching',
  },
  {
    id: 'COR-04',
    name: 'Mathura Road (Badarpur Flyover Descent)',
    corridor: 'Mathura Road',
    pci: 58,
    status: 'fair',
    defectCount: 19,
    lengthKm: 9.6,
    tripsPerDay: 510,
    primaryDefect: 'Monsoon Waterlogging & Cracking',
    lastInspected: '48m ago (DTC-2219)',
    recommendedAction: 'Bituminous Tack Coat & Slurry Surfacing',
  },
  {
    id: 'COR-05',
    name: 'Rohtak Road (Peera Garhi - Nangloi Stretch)',
    corridor: 'Rohtak Road',
    pci: 38,
    status: 'critical',
    defectCount: 42,
    lengthKm: 8.5,
    tripsPerDay: 340,
    primaryDefect: 'Severe Potholes & Structural Rutting',
    lastInspected: '8m ago (DTC-3011)',
    recommendedAction: 'URGENT: 50mm Milling & Dense Bituminous Overlay',
  },
];
