import { clsx, type ClassValue } from 'clsx';
import type { AlertType, AlertStatus } from '../types';

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
    color: '#fb7185', // Rose
    glowClass: 'shadow-[0_0_16px_rgba(251,113,133,0.4)]',
    textClass: 'text-rose-400',
    bgClass: 'bg-rose-500/10',
    borderClass: 'border-rose-500/30',
    icon: '🚨',
    severity: 3,
  },
  bottleneck: {
    label: 'Bottleneck',
    color: '#f59e0b', // Amber
    glowClass: 'shadow-[0_0_16px_rgba(245,158,11,0.4)]',
    textClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30',
    icon: '🚦',
    severity: 2,
  },
  vehicle_density: {
    label: 'High Density',
    color: '#ffffff', // High contrast White
    glowClass: 'shadow-[0_0_16px_rgba(255,255,255,0.4)]',
    textClass: 'text-white',
    bgClass: 'bg-white/10',
    borderClass: 'border-white/30',
    icon: '🚗',
    severity: 2,
  },
  pedestrian_risk: {
    label: 'Pedestrian Risk',
    color: '#4ef2bb', // Electric Motion.dev Mint
    glowClass: 'shadow-[0_0_16px_rgba(78,242,187,0.4)]',
    textClass: 'text-[#4ef2bb]',
    bgClass: 'bg-[#4ef2bb]/10',
    borderClass: 'border-[#4ef2bb]/30',
    icon: '🚶',
    severity: 2,
  },
  pothole: {
    label: 'Pothole',
    color: '#4ef2bb', // Electric Mint
    glowClass: 'shadow-[0_0_16px_rgba(78,242,187,0.45)]',
    textClass: 'text-[#4ef2bb]',
    bgClass: 'bg-[#4ef2bb]/10',
    borderClass: 'border-[#4ef2bb]/30',
    icon: '🕳️',
    severity: 2,
  },
  waterlogging: {
    label: 'Waterlogging',
    color: '#d4d4d8', // Zinc Silver
    glowClass: 'shadow-[0_0_16px_rgba(212,212,216,0.3)]',
    textClass: 'text-zinc-300',
    bgClass: 'bg-zinc-500/15',
    borderClass: 'border-zinc-400/30',
    icon: '💧',
    severity: 1,
  },
  missing_signboard: {
    label: 'Missing Signboard',
    color: '#a1a1aa', // Zinc Light Gray
    glowClass: 'shadow-[0_0_16px_rgba(161,161,170,0.3)]',
    textClass: 'text-zinc-300',
    bgClass: 'bg-zinc-500/15',
    borderClass: 'border-zinc-400/30',
    icon: '🚫',
    severity: 1,
  },
  missing_crossing: {
    label: 'Missing Crossing',
    color: '#ffffff', // Stark White
    glowClass: 'shadow-[0_0_16px_rgba(255,255,255,0.3)]',
    textClass: 'text-white',
    bgClass: 'bg-white/15',
    borderClass: 'border-white/30',
    icon: '⬜',
    severity: 1,
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
  return `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
}
