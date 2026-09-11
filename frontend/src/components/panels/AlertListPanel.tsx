import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ALERT_VISUALS, STATUS_VISUALS, timeAgo, confidencePct, confidenceColor, cn } from '../../lib/theme';
import { useAppStore } from '../../store/useAppStore';
import type { Alert, FilterType } from '../../types';
import { calculateSLA } from '../../lib/slaAndCost';

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="skeleton w-8 h-8 rounded-xl shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="skeleton h-3 w-28 rounded" />
        <div className="skeleton h-2 w-16 rounded" />
      </div>
      <div className="skeleton w-10 h-5 rounded-full" />
    </div>
  );
}

// ─── Single alert row ─────────────────────────────────────────────────────────

function AlertRow({
  alert,
  isSelected,
  onSelect,
}: {
  alert: Alert;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const vis = ALERT_VISUALS[alert.type];
  const statusVis = STATUS_VISUALS[alert.status];

  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12, height: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.04)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-all cursor-pointer group rounded-xl my-0.5',
        isSelected
          ? 'bg-amber-500/15 border border-amber-500/35'
          : 'border border-transparent'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 transition-shadow',
          vis.bgClass,
          isSelected ? vis.glowClass : ''
        )}
        style={{ border: `1px solid ${vis.color}33` }}
      >
        {vis.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn('text-sm font-medium truncate', vis.textClass)}>
            {vis.label}
          </span>
          {alert.meta.verified_by_bus_count && alert.meta.verified_by_bus_count > 1 && (
            <span className="text-[10px] text-white/40 bg-white/5 rounded px-1">
              ×{alert.meta.verified_by_bus_count}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-white/35 font-mono">{alert.bus_id}</span>
          <span className="text-white/20">·</span>
          <span className="text-[11px] text-white/35">{timeAgo(alert.timestamp)}</span>
          <span className="text-white/20">·</span>
          <span className={cn('text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded border', calculateSLA(alert).badgeClass)}>
            {calculateSLA(alert).badgeLabel}
          </span>
          {alert.meta.plate_number && (
            <>
              <span className="text-white/20">·</span>
              <span className="text-[11px] font-mono text-amber-400/80">{alert.meta.plate_number}</span>
            </>
          )}
        </div>
      </div>

      {/* Confidence + status */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={cn('text-xs font-mono font-bold', confidenceColor(alert.confidence))}>
          {confidencePct(alert.confidence)}
        </span>
        <span
          className={cn(
            'text-[10px] rounded-full px-2 py-0.5 font-medium',
            statusVis.bgClass, statusVis.textClass, `border ${statusVis.borderClass}`
          )}
        >
          {statusVis.label}
        </span>
      </div>
    </motion.button>
  );
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

const FILTER_OPTIONS: { type: FilterType; label: string; icon: string }[] = [
  { type: 'all',                label: 'All',        icon: '⬡' },
  { type: 'incident_hit_and_run', label: 'Incidents', icon: '🚨' },
  { type: 'pothole',            label: 'Potholes',   icon: '🕳️' },
  { type: 'bottleneck',         label: 'Traffic',    icon: '🚦' },
  { type: 'pedestrian_risk',    label: 'Pedestrian', icon: '🚶' },
];

// ─── Alert list panel ─────────────────────────────────────────────────────────

interface AlertListPanelProps {
  alerts: Alert[];
  isLoading: boolean;
}

export function AlertListPanel({ alerts, isLoading }: AlertListPanelProps) {
  const { selectedAlertId, setSelectedAlertId, filterType, setFilterType, flyTo } = useAppStore();
  const [collapsed, setCollapsed] = useState(false);

  const filtered = filterType === 'all'
    ? alerts
    : alerts.filter((a) => a.type === filterType);

  const handleSelect = (alert: Alert) => {
    setSelectedAlertId(alert.id === selectedAlertId ? null : alert.id);
    flyTo(alert.lat, alert.long);
  };

  return (
    <motion.div
      animate={{ width: collapsed ? 48 : 300 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ willChange: 'transform' }}
      className="glass border border-white/8 flex flex-col overflow-hidden m-3 rounded-2xl"
    >
      {/* Header */}
      <div className="h-11 flex items-center justify-between px-3 border-b border-white/5 shrink-0">
        {!collapsed && (
          <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
            Recent Alerts
            <span className="ml-2 text-amber-400 font-mono">{filtered.length}</span>
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors cursor-pointer"
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Filter tabs */}
          <div className="flex gap-1 p-2 border-b border-white/5 overflow-x-auto scrollbar-none shrink-0">
            {FILTER_OPTIONS.map(({ type, label, icon }) => (
              <motion.button
                key={type}
                onClick={() => setFilterType(type)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{ willChange: 'transform' }}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0',
                  filterType === type
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
                )}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </motion.button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
            ) : (
              <AnimatePresence mode="popLayout">
                {filtered.map((alert) => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    isSelected={alert.id === selectedAlertId}
                    onSelect={() => handleSelect(alert)}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}
