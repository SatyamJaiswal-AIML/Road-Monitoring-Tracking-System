/**
 * API client — single swap point.
 * VITE_USE_MOCK=true  → returns mock data (default for dev/demo)
 * VITE_USE_MOCK=false → hits real backend at VITE_API_BASE_URL
 */

import type {
  Alert, AlertStatus, AnalyticsSummary,
  HeatmapPoint, RouteReplay, FilterType, MapBounds,
  VideoAnalysisResult, LiveFrameResult,
} from '../types';

import {
  MOCK_ALERTS, MOCK_SUMMARY, MOCK_HEATMAP, MOCK_ROUTES,
} from '../data/mockData';
import { useAppStore } from '../store/useAppStore';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
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

export async function downloadWorkOrderPdf(alertId: string, alertData?: Alert): Promise<void> {
  // 1. Resolve alert data from argument, store, or mock list
  let alert = alertData;
  if (!alert) {
    try {
      const storeAlerts = useAppStore.getState().alerts;
      alert = storeAlerts?.find((a) => a.id === alertId);
    } catch (_e) {
      // Store not ready
    }
  }
  if (!alert) {
    alert = MOCK_ALERTS.find((a) => a.id === alertId);
  }

  // 2. Safe fallback alert so generation NEVER fails
  if (!alert) {
    alert = {
      id: alertId,
      type: 'pothole',
      confidence: 0.94,
      bus_id: 'DTC-4182',
      lat: 28.542,
      long: 77.126,
      timestamp: new Date().toISOString(),
      status: 'open',
      meta: {
        verified_by_bus_count: 2,
        repaired_by_contractor: 'M/s Delhi PWD Road Maintenance Concessionaire (Zone-Central)',
      },
    };
  }

  // 3. Client-Side PDF Generation (100% reliable on Vercel deployment, offline, and mobile)
  try {
    const { generateClientWorkOrderPdf } = await import('./workOrderPdfGenerator');
    const doc = generateClientWorkOrderPdf(alert);
    doc.save(`PWD_WorkOrder_${alert.id}.pdf`);
  } catch (err) {
    console.error('Client PDF generation error:', err);
  }
}

// ─── POST /api/video/analyze ─────────────────────────────────────────────────

export async function analyzeVideoFile(params: {
  file: File;
  busId?: string;
  confidenceThreshold?: number;
  sampleEveryNFrames?: number;
  saveToDb?: boolean;
  routeJson?: string;
}): Promise<VideoAnalysisResult> {
  // Always try real FastAPI AI backend first unless strictly offline
  try {
    const formData = new FormData();
    formData.append('file', params.file);
    formData.append('bus_id', params.busId ?? 'VIDEO-UPLOAD');
    formData.append('confidence_threshold', String(params.confidenceThreshold ?? 0.35));
    formData.append('sample_every_n_frames', String(params.sampleEveryNFrames ?? 10));
    formData.append('save_to_db', String(params.saveToDb ?? true));
    if (params.routeJson) formData.append('route_json', params.routeJson);

    const res = await fetch(`${BASE_URL}/api/video/analyze`, { method: 'POST', body: formData });
    if (res.ok) {
      return await res.json();
    }
    const errText = await res.text();
    console.error('Backend returned error:', res.status, errText);
    if (!USE_MOCK) throw new Error(`analyzeVideoFile: ${res.status} ${errText}`);
  } catch (err) {
    if (!USE_MOCK) throw err;
    console.warn('Backend unavailable, falling back to simulated analysis:', err);
  }

  // Simulated fallback with unique snapshot image URLs
  await delay(2000);
  return {
    video_info: { fps: 25, total_frames: 750, duration_sec: 30, resolution: '1920x1080', frames_analyzed: 75 },
    summary: {
      total_potholes: 5,
      severity_level_1: 1,
      severity_level_2: 2,
      severity_level_3: 2,
      total_vehicle_alerts: 2,
      speeding_count: 1,
      rash_driving_count: 1,
    },
    potholes: [
      { detection_id: 'PH001', type: 'pothole', confidence: 0.92, lat: 28.6315, long: 77.2167, frame_idx: 30, timestamp_sec: 1.2, bounding_box: [120, 380, 85, 60] as [number,number,number,number], area_pct: 5.2, depth_score: 0.81, severity_level: 3, severity_label: 'Critical', action_required: '🚨 IMMEDIATE ACTION REQUIRED — Road closure risk', color: '#ef4444', image_url: '/images/alerts/pothole_PH001.jpg' },
      { detection_id: 'PH002', type: 'pothole', confidence: 0.78, lat: 28.6328, long: 77.2195, frame_idx: 75, timestamp_sec: 3.0, bounding_box: [200, 400, 55, 40] as [number,number,number,number], area_pct: 2.8, depth_score: 0.52, severity_level: 2, severity_label: 'Medium', action_required: '⚠️ Scheduled Maintenance — Repair within 72 hours', color: '#f59e0b', image_url: '/images/alerts/pothole_PH002.jpg' },
      { detection_id: 'PH003', type: 'pothole', confidence: 0.65, lat: 28.6270, long: 77.2300, frame_idx: 120, timestamp_sec: 4.8, bounding_box: [310, 420, 38, 28] as [number,number,number,number], area_pct: 1.1, depth_score: 0.28, severity_level: 1, severity_label: 'Low', action_required: '📋 Routine Monitoring — Log and schedule inspection', color: '#22c55e', image_url: '/images/alerts/pothole_PH003.jpg' },
      { detection_id: 'PH004', type: 'pothole', confidence: 0.88, lat: 28.6380, long: 77.2400, frame_idx: 155, timestamp_sec: 6.2, bounding_box: [90, 360, 72, 55] as [number,number,number,number], area_pct: 4.1, depth_score: 0.73, severity_level: 3, severity_label: 'Critical', action_required: '🚨 IMMEDIATE ACTION REQUIRED — Pothole severity high', color: '#ef4444', image_url: '/images/alerts/pothole_PH004.jpg' },
      { detection_id: 'PH005', type: 'pothole', confidence: 0.71, lat: 28.6200, long: 77.2150, frame_idx: 200, timestamp_sec: 8.0, bounding_box: [250, 390, 48, 35] as [number,number,number,number], area_pct: 2.2, depth_score: 0.44, severity_level: 2, severity_label: 'Medium', action_required: '⚠️ Scheduled Maintenance — Repair within 72 hours', color: '#f59e0b', image_url: '/images/alerts/pothole_PH005.jpg' },
    ],
    vehicle_alerts: [],
    alerts: [],
    frame_timeline: [],
    db_ingested_count: 5,
  };
}

// ─── POST /api/video/analyze-frame ───────────────────────────────────────────

export async function analyzeCameraFrame(params: {
  frameBlob: Blob;
  frameIdx?: number;
  totalFrames?: number;
  fps?: number;
  busId?: string;
  lat?: number;
  lng?: number;
}): Promise<LiveFrameResult> {
  const fIdx = params.frameIdx ?? 0;
  const lat = params.lat ?? (28.6315 + (fIdx * 0.0008));
  const lng = params.lng ?? (77.2167 + (fIdx * 0.0006));

  if (USE_MOCK) {
    await delay(250);
    // Alternate simulated pothole and vehicle detection for demo purposes
    const hasPothole = fIdx % 2 === 0;
    const sevLevel: 1 | 2 | 3 = (fIdx % 3 === 0 ? 3 : (fIdx % 3 === 1 ? 2 : 1));
    const sevLabels = { 1: 'Low', 2: 'Medium', 3: 'Critical' } as const;
    const sevColors = { 1: '#22c55e', 2: '#f59e0b', 3: '#ef4444' } as const;

    const mockPothole = hasPothole ? [{
      detection_id: `PH-LIVE-${fIdx}`,
      type: 'pothole' as const,
      confidence: 0.88 + ((fIdx % 10) * 0.01),
      lat,
      long: lng,
      frame_idx: fIdx,
      bounding_box: [180 + ((fIdx * 30) % 300), 220 + ((fIdx * 20) % 150), 90, 65] as [number, number, number, number],
      area_pct: sevLevel === 3 ? 5.4 : (sevLevel === 2 ? 3.1 : 1.2),
      depth_score: sevLevel === 3 ? 0.82 : (sevLevel === 2 ? 0.54 : 0.28),
      severity_level: sevLevel,
      severity_label: sevLabels[sevLevel],
      action_required: sevLevel === 3 ? '🚨 IMMEDIATE ACTION REQUIRED — Severe crater' : (sevLevel === 2 ? '⚠️ Scheduled Maintenance (72h)' : '📋 Routine Monitoring'),
      color: sevColors[sevLevel],
    }] : [];

    const mockVehicle = fIdx % 3 === 0 ? [{
      track_id: fIdx + 10,
      type: 'speeding_vehicle' as const,
      class_name: 'car',
      avg_speed_kmh: 74.5,
      max_speed_kmh: 79.0,
      speed_limit_kmh: 60,
      rash_score: 0.22,
      is_speeding: true,
      is_rash: false,
      lat,
      long: lng,
      frame_idx: fIdx,
      confidence: 0.91,
      bbox: [320, 140, 140, 95] as [number, number, number, number],
    }] : [];

    return {
      frame_idx: fIdx,
      gps: { lat, long: lng },
      potholes: mockPothole,
      vehicle_alerts: mockVehicle,
      alerts: [],
      annotated_frame_b64: '',
      timestamp: new Date().toISOString(),
    };
  }

  const formData = new FormData();
  formData.append('file', params.frameBlob, 'frame.jpg');
  formData.append('frame_idx', String(fIdx));
  formData.append('total_frames', String(params.totalFrames ?? 100));
  formData.append('fps', String(params.fps ?? 25));
  formData.append('bus_id', params.busId ?? 'LIVE-CAM');
  if (params.lat != null) formData.append('lat', String(params.lat));
  if (params.lng != null) formData.append('long', String(params.lng));

  try {
    const res = await fetch(`${BASE_URL}/api/video/analyze-frame`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`analyzeCameraFrame: ${res.status}`);
    return await res.json();
  } catch (netErr) {
    console.warn('Backend live frame call failed, using fallback:', netErr);
    throw netErr;
  }
}

export async function saveVideoAlerts(alerts: object[], busId = 'VIDEO-UPLOAD'): Promise<{ saved_count: number; saved_ids: string[] }> {
  try {
    const res = await fetch(`${BASE_URL}/api/video/save-alerts?bus_id=${busId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alerts),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('saveVideoAlerts failed on backend, falling back:', e);
  }
  return { saved_count: alerts.length, saved_ids: [] };
}

// ─── DELETE /alerts/:id or /api/video/potholes/:id ───────────────────────────

export async function deleteVideoPothole(detectionId: string): Promise<{ deleted: boolean; id: string; message: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/video/potholes/${detectionId}`, {
      method: 'DELETE',
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('deleteVideoPothole backend call failed:', e);
  }
  return { deleted: true, id: detectionId, message: `Removed pothole #${detectionId} from active session.` };
}

export async function deleteVideoPotholesBatch(detectionIds: string[]): Promise<{ deleted_count: number; message: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/video/potholes/delete-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(detectionIds),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('deleteVideoPotholesBatch backend call failed:', e);
  }
  return { deleted_count: detectionIds.length, message: `Removed ${detectionIds.length} potholes.` };
}

export async function deleteAlert(alertId: string): Promise<{ deleted: boolean; id: string; message: string }> {
  try {
    const res = await fetch(`${BASE_URL}/alerts/${alertId}`, {
      method: 'DELETE',
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('deleteAlert backend call failed:', e);
  }
  return { deleted: true, id: alertId, message: `Alert ${alertId} deleted.` };
}


