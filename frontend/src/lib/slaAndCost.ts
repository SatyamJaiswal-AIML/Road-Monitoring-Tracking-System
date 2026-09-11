/**
 * PWD Schedule of Rates (CPWD DSR 2023) Pothole Repair Cost Estimator
 * & 72-Hour Municipal Contractor SLA Countdown Engine
 */

import type { Alert } from '../types';

export interface SLACountdown {
  totalHoursRemaining: number;
  formattedTime: string;
  isBreached: boolean;
  status: 'safe' | 'warning' | 'critical' | 'breached' | 'resolved';
  badgeLabel: string;
  badgeClass: string;
}

export interface RepairCostEstimate {
  estimatedAreaSqm: number;
  bitumenMixCostInr: number;
  laborAndMachineryInr: number;
  trafficDiversionInr: number;
  totalCostInr: number;
  itemCode: string;
  actionSummary: string;
}

/**
 * Standard 72-Hour SLA from incident timestamp.
 */
export function calculateSLA(alert: Alert): SLACountdown {
  if (alert.status === 'resolved') {
    return {
      totalHoursRemaining: 0,
      formattedTime: 'Resolved',
      isBreached: false,
      status: 'resolved',
      badgeLabel: '✓ Rectified',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    };
  }

  const SLA_TOTAL_HOURS = 72;
  const alertTime = new Date(alert.timestamp).getTime();
  const now = Date.now();
  const elapsedMs = Math.max(0, now - alertTime);
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const remainingHours = SLA_TOTAL_HOURS - elapsedHours;

  if (remainingHours <= 0) {
    const overdueHours = Math.abs(Math.floor(remainingHours));
    return {
      totalHoursRemaining: remainingHours,
      formattedTime: `${overdueHours}h Overdue`,
      isBreached: true,
      status: 'breached',
      badgeLabel: `⚠️ SLA Breached (${overdueHours}h)`,
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse',
    };
  }

  const hrs = Math.floor(remainingHours);
  const mins = Math.floor((remainingHours - hrs) * 60);

  if (remainingHours < 12) {
    return {
      totalHoursRemaining: remainingHours,
      formattedTime: `${hrs}h ${mins}m left`,
      isBreached: false,
      status: 'critical',
      badgeLabel: `🚨 ${hrs}h ${mins}m SLA`,
      badgeClass: 'bg-red-500/20 text-red-300 border-red-500/35',
    };
  } else if (remainingHours < 24) {
    return {
      totalHoursRemaining: remainingHours,
      formattedTime: `${hrs}h ${mins}m left`,
      isBreached: false,
      status: 'warning',
      badgeLabel: `⏱️ ${hrs}h SLA left`,
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/35',
    };
  }

  return {
    totalHoursRemaining: remainingHours,
    formattedTime: `${hrs}h left`,
    isBreached: false,
    status: 'safe',
    badgeLabel: `⏱️ ${hrs}h SLA`,
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  };
}

/**
 * PWD Schedule of Rates (DSR) Item 5.12: Cold-mix bitumen pothole patch repair.
 */
export function estimateRepairCost(alert: Alert): RepairCostEstimate {
  // Derive area proxy (default ~0.35 sqm for standard defect)
  const areaPct = alert.meta?.area_pct || 4.2;
  const estimatedAreaSqm = Math.max(0.15, Math.min(2.5, +(areaPct * 0.08).toFixed(2)));

  const severity = alert.meta?.severity_level || (alert.confidence > 0.8 ? 3 : alert.confidence > 0.6 ? 2 : 1);

  // Rates per sq.meter based on severity
  const baseRatePerSqm = severity === 3 ? 2400 : severity === 2 ? 1800 : 1350;
  const bitumenMixCostInr = Math.round(estimatedAreaSqm * baseRatePerSqm);
  const laborAndMachineryInr = Math.round(bitumenMixCostInr * 0.45);
  const trafficDiversionInr = severity === 3 ? 450 : 250;

  const totalCostInr = bitumenMixCostInr + laborAndMachineryInr + trafficDiversionInr;

  const itemCode = severity === 3 ? 'CPWD-DSR-5.12.3 (Emergency Patch)' : 'CPWD-DSR-5.12.1 (Standard Patch)';
  const actionSummary =
    severity === 3
      ? 'Emergency cold-mix deep bitumen tack coat & mechanical compaction'
      : severity === 2
      ? 'WMM base stabilization & cold bituminous overlay'
      : 'Surface crack sealing & edge dressing';

  return {
    estimatedAreaSqm,
    bitumenMixCostInr,
    laborAndMachineryInr,
    trafficDiversionInr,
    totalCostInr,
    itemCode,
    actionSummary,
  };
}
