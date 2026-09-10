import { clsx, type ClassValue } from 'clsx';
import type { AlertType, AlertStatus, SeverityLevel } from '../types';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// ─── Motion.dev Inspired Palette (Pitch Black + Electric Mint / White / Rose / Amber) ───

export interface AlertVisual {
  label: string;
  color: string;
  glowClass: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  icon: string;
  severity: 1 | 2 | 3;
}

export const ALERT_VISUALS: Record<AlertType, AlertVisual> = {
  incident_hit_and_run: {
    label: 'Hit & Run',
    color: '#fb7185',
    glowClass: 'shadow-[0_0_16px_rgba(251,113,133,0.4)]',
    textClass: 'text-rose-400',
    bgClass: 'bg-rose-500/10',
    borderClass: 'border-rose-500/30',
    icon: '🚗',
    severity: 3,
  },
  bottleneck: {
    label: 'Bottleneck',
    color: '#f59e0b',
    glowClass: 'shadow-[0_0_16px_rgba(245,158,11,0.4)]',
    textClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30',
    icon: '🚦',
    severity: 2,
  },
  vehicle_density: {
    label: 'High Density',
    color: '#ffffff',
    glowClass: 'shadow-[0_0_16px_rgba(255,255,255,0.4)]',
    textClass: 'text-white',
    bgClass: 'bg-white/10',
    borderClass: 'border-white/30',
    icon: '🚌',
    severity: 2,
  },
  pedestrian_risk: {
    label: 'Pedestrian Risk',
    color: '#4ef2bb',
    glowClass: 'shadow-[0_0_16px_rgba(78,242,187,0.4)]',
    textClass: 'text-[#4ef2bb]',
    bgClass: 'bg-[#4ef2bb]/10',
    borderClass: 'border-[#4ef2bb]/30',
    icon: '🚶',
    severity: 2,
  },
  pothole: {
    label: 'Pothole',
    color: '#4ef2bb',
    glowClass: 'shadow-[0_0_16px_rgba(78,242,187,0.45)]',
    textClass: 'text-[#4ef2bb]',
    bgClass: 'bg-[#4ef2bb]/10',
    borderClass: 'border-[#4ef2bb]/30',
    icon: '🕳️',
    severity: 2,
  },
  waterlogging: {
    label: 'Waterlogging',
    color: '#d4d4d8',
    glowClass: 'shadow-[0_0_16px_rgba(212,212,216,0.3)]',
    textClass: 'text-zinc-300',
    bgClass: 'bg-zinc-500/15',
    borderClass: 'border-zinc-400/30',
    icon: '💧',
    severity: 1,
  },
  missing_signboard: {
    label: 'Missing Signboard',
    color: '#a1a1aa',
    glowClass: 'shadow-[0_0_16px_rgba(161,161,170,0.3)]',
    textClass: 'text-zinc-300',
    bgClass: 'bg-zinc-500/15',
    borderClass: 'border-zinc-400/30',
    icon: '🚧',
    severity: 1,
  },
  missing_crossing: {
    label: 'Missing Crossing',
    color: '#ffffff',
    glowClass: 'shadow-[0_0_16px_rgba(255,255,255,0.3)]',
    textClass: 'text-white',
    bgClass: 'bg-white/15',
    borderClass: 'border-white/30',
    icon: '🛑',
    severity: 1,
  },
  // ─── NEW: Video/Camera pipeline alert types ─────────────────────────────────
  speeding_vehicle: {
    label: 'Speeding Vehicle',
    color: '#f97316', // Orange
    glowClass: 'shadow-[0_0_16px_rgba(249,115,22,0.45)]',
    textClass: 'text-orange-400',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/30',
    icon: '⚡',
    severity: 2,
  },
  rash_driving: {
    label: 'Rash Driving',
    color: '#ef4444', // Red
    glowClass: 'shadow-[0_0_16px_rgba(239,68,68,0.5)]',
    textClass: 'text-red-400',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/30',
    icon: '🚨',
    severity: 3,
  },
};

// ─── Pothole 3-Level Severity Visuals ────────────────────────────────────────

export interface SeverityVisual {
  label: string;
  color: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  glowClass: string;
  badgeEmoji: string;
  actionText: string;
}

export const SEVERITY_VISUALS: Record<SeverityLevel, SeverityVisual> = {
  1: {
    label: 'Low Severity',
    color: '#22c55e',
    textClass: 'text-green-400',
    bgClass: 'bg-green-500/10',
    borderClass: 'border-green-500/30',
    glowClass: 'shadow-[0_0_12px_rgba(34,197,94,0.3)]',
    badgeEmoji: '🟢',
    actionText: 'Routine Monitoring',
  },
  2: {
    label: 'Medium Severity',
    color: '#f59e0b',
    textClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30',
    glowClass: 'shadow-[0_0_12px_rgba(245,158,11,0.35)]',
    badgeEmoji: '🟡',
    actionText: 'Scheduled Maintenance',
  },
  3: {
    label: 'CRITICAL — Immediate Action',
    color: '#ef4444',
    textClass: 'text-red-400',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/30',
    glowClass: 'shadow-[0_0_16px_rgba(239,68,68,0.5)]',
    badgeEmoji: '🔴',
    actionText: '🚨 IMMEDIATE ACTION REQUIRED',
  },
};

export const STATUS_VISUALS: Record<AlertStatus, { label: string; textClass: string; bgClass: string; borderClass: string }> = {
  open: {
    label: 'Open',
    textClass: 'text-rose-400',
    bgClass: 'bg-rose-500/15',
    borderClass: 'border-rose-500/30',
  },
  acknowledged: {
    label: 'In Progress',
    textClass: 'text-amber-400',
    bgClass: 'bg-amber-500/15',
    borderClass: 'border-amber-500/30',
  },
  resolved: {
    label: 'Resolved',
    textClass: 'text-[#4ef2bb]',
    bgClass: 'bg-[#4ef2bb]/15',
    borderClass: 'border-[#4ef2bb]/30',
  },
};

export function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function confidenceColor(c: number): string {
  if (c >= 0.9) return 'text-[#4ef2bb]';
  if (c >= 0.75) return 'text-amber-400';
  return 'text-rose-400';
}

export function confidencePct(c: number): string {
  return `${Math.round(c * 100)}%`;
}

export function formatGPS(lat: number, lng: number): string {
  return `${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`;
}

/** Get severity visual config for a pothole meta severity_level */
export function getSeverityVisual(level?: number | null): SeverityVisual {
  if (level === 3) return SEVERITY_VISUALS[3];
  if (level === 2) return SEVERITY_VISUALS[2];
  return SEVERITY_VISUALS[1];
}
