/**
 * API client — single swap point.
 * VITE_USE_MOCK=true  → returns mock data (default for dev/demo)
 * VITE_USE_MOCK=false → hits real backend at VITE_API_BASE_URL
 */

import type {
  Alert, AlertStatus, AnalyticsSummary,
  HeatmapPoint, RouteReplay, FilterType, MapBounds,
} from '../types';

import {
  MOCK_ALERTS, MOCK_SUMMARY, MOCK_HEATMAP, MOCK_ROUTES,
} from '../data/mockData';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

// Simulate network latency in mock mode so loading states are visible
const delay = (ms = 600) => new Promise<void>((r) => setTimeout(r, ms));

// ─── GET /alerts ──────────────────────────────────────────────────────────────

export async function fetchAlerts(params?: {
  type?: FilterType;
  since?: string;
  until?: string;
  bounds?: MapBounds;
}): Promise<Alert[]> {
  if (USE_MOCK) {
    await delay();
    let data = [...MOCK_ALERTS];
    if (params?.type && params.type !== 'all')
      data = data.filter((a) => a.type === params.type);
    return data.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  const q = new URLSearchParams();
  if (params?.type && params.type !== 'all') q.set('type', params.type);
  if (params?.since) q.set('since', params.since);
  if (params?.until) q.set('until', params.until);
  if (params?.bounds) {
    q.set('min_lat',  String(params.bounds.min_lat));
    q.set('max_lat',  String(params.bounds.max_lat));
    q.set('min_long', String(params.bounds.min_long));
    q.set('max_long', String(params.bounds.max_long));
  }
  const res = await fetch(`${BASE_URL}/alerts?${q}`);
  if (!res.ok) throw new Error(`fetchAlerts: ${res.status}`);
  return res.json();
}

// ─── GET /alerts/:id ─────────────────────────────────────────────────────────

export async function fetchAlert(id: string): Promise<Alert> {
  if (USE_MOCK) {
    await delay(300);
    const a = MOCK_ALERTS.find((x) => x.id === id);
    if (!a) throw new Error(`Alert ${id} not found`);
    return a;
  }
  const res = await fetch(`${BASE_URL}/alerts/${id}`);
  if (!res.ok) throw new Error(`fetchAlert: ${res.status}`);
  return res.json();
}

// ─── PATCH /alerts/:id ───────────────────────────────────────────────────────

export async function updateAlertStatus(
  id: string,
  status: AlertStatus
): Promise<Alert> {
  if (USE_MOCK) {
    await delay(400);
    const a = MOCK_ALERTS.find((x) => x.id === id);
    if (!a) throw new Error(`Alert ${id} not found`);
    a.status = status; // mutate mock in-memory
    return a;
  }
  const res = await fetch(`${BASE_URL}/alerts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`updateAlertStatus: ${res.status}`);
  return res.json();
}

// ─── GET /analytics/heatmap ──────────────────────────────────────────────────

export async function fetchHeatmap(params?: {
  type?: FilterType;
  since?: string;
  until?: string;
}): Promise<HeatmapPoint[]> {
  if (USE_MOCK) {
    await delay(500);
    return MOCK_HEATMAP;
  }
  const q = new URLSearchParams();
  if (params?.type && params.type !== 'all') q.set('type', params.type);
  if (params?.since) q.set('since', params.since);
  if (params?.until) q.set('until', params.until);
  const res = await fetch(`${BASE_URL}/analytics/heatmap?${q}`);
  if (!res.ok) throw new Error(`fetchHeatmap: ${res.status}`);
  const data = await res.json();
  return (data || []).map((item: any) => {
    if (Array.isArray(item)) {
      return { lat: item[0], long: item[1], weight: item[2] ?? 0.8 };
    }
    return item;
  });
}

// ─── GET /analytics/summary ──────────────────────────────────────────────────

export async function fetchSummary(): Promise<AnalyticsSummary> {
  if (USE_MOCK) {
    await delay(400);
    return MOCK_SUMMARY;
  }
  const res = await fetch(`${BASE_URL}/analytics/summary`);
  if (!res.ok) throw new Error(`fetchSummary: ${res.status}`);
  const data = await res.json();
  return {
    ...data,
    total_alerts_today: data.total_alerts_today ?? (data.open_defects + data.active_incidents),
  };
}

// ─── GET /routes/:bus_id/replay ──────────────────────────────────────────────

export async function fetchRouteReplay(busId: string): Promise<RouteReplay> {
  if (USE_MOCK) {
    await delay(600);
    const r = MOCK_ROUTES.find((x) => x.bus_id === busId);
    if (!r) throw new Error(`Route for ${busId} not found`);
    return r;
  }
  const res = await fetch(`${BASE_URL}/routes/${busId}/replay`);
  if (!res.ok) throw new Error(`fetchRouteReplay: ${res.status}`);
  return res.json();
}

// ─── GET /alerts/:id/work-order-pdf ─────────────────────────────────────────

export function getWorkOrderPdfUrl(alertId: string): string {
  return `${BASE_URL}/alerts/${alertId}/work-order-pdf`;
}

export function downloadWorkOrderPdf(alertId: string): void {
  const url = getWorkOrderPdfUrl(alertId);
  window.open(url, '_blank');
}

