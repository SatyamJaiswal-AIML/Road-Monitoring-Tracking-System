import type { Alert, AlertType } from '../types';

/**
 * Alert image configuration.
 * 
 * NOTE: We no longer use fallback stock photos.
 * Real captures come from edge processor (process_real_video.py) via meta.image_url.
 * When no real capture exists, AlertCameraSnapshot shows a "AWAITING EDGE CAPTURE" placeholder.
 * 
 * This file only provides label/color config for UI display.
 */

export const ALERT_LABEL_MAP: Record<AlertType, {
  label: string;
  accentColor: string;
}> = {
  pothole: {
    label: 'Road Surface Defect (Pothole)',
    accentColor: '#ef4444',
  },
  waterlogging: {
    label: 'Monsoon Waterlogging Hazard',
    accentColor: '#00d4ff',
  },
  missing_signboard: {
    label: 'Damaged/Missing Signboard',
    accentColor: '#f59e0b',
  },
  missing_crossing: {
    label: 'Faded Pedestrian Crossing',
    accentColor: '#eab308',
  },
  vehicle_density: {
    label: 'High Vehicle Congestion',
    accentColor: '#38bdf8',
  },
  bottleneck: {
    label: 'Road Chokepoint & Bottleneck',
    accentColor: '#f97316',
  },
  pedestrian_risk: {
    label: 'Pedestrian Roadway Hazard',
    accentColor: '#f43f5e',
  },
  incident_hit_and_run: {
    label: 'Hit & Run / Collision with ANPR',
    accentColor: '#dc2626',
  },
  speeding_vehicle: {
    label: 'Speeding Vehicle Detected',
    accentColor: '#f97316',
  },
  rash_driving: {
    label: 'Dangerous / Rash Driving Pattern',
    accentColor: '#ef4444',
  },
};

export function getAlertLabel(alert: Alert) {
  const conf = ALERT_LABEL_MAP[alert.type] || ALERT_LABEL_MAP.pothole;
  return conf.label;
}
