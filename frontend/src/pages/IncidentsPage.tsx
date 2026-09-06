import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import { fetchAlerts } from '../lib/api';
import {
  ALERT_VISUALS, STATUS_VISUALS, confidencePct, confidenceColor,
  formatGPS, timeAgo, cn,
} from '../lib/theme';
import type { Alert, AlertType } from '../types';

// ─── Tab definitions ──────────────────────────────────────────────────────────

const ROAD_TYPES: AlertType[] = ['pothole', 'waterlogging', 'missing_signboard', 'missing_crossing'];
const TRAFFIC_TYPES: AlertType[] = ['vehicle_density', 'bottleneck', 'pedestrian_risk', 'incident_hit_and_run'];

type TabId = 'road' | 'traffic';

const TABS: { id: TabId; label: string; icon: string; color: string; borderColor: string; bgColor: string; types: AlertType[]; description: string }[] = [
  {
    id: 'road',
    label: 'Road Conditions',
    icon: '🛣️',
    color: 'text-[#4ef2bb]',
    borderColor: 'border-[#4ef2bb]/50',
    bgColor: 'bg-[#4ef2bb]/10',
    types: ROAD_TYPES,
    description: 'Potholes, waterlogging, missing signboards & crossings',
  },
  {
    id: 'traffic',
    label: 'Traffic & Safety',
    icon: '🚦',
    color: 'text-white',
    borderColor: 'border-white/30',
    bgColor: 'bg-white/5',
    types: TRAFFIC_TYPES,
    description: 'Bottlenecks, high density, pedestrian risk & incidents',
  },
];

// ─── Stat badge ───────────────────────────────────────────────────────────────

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl bg-[#0e0e10] border border-white/[0.12]">
      <span className={cn('text-xl font-bold tabular-nums font-mono', color)}>{value}</span>
      <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">{label}</span>
    </div>
  );
}

// ─── Road issue sub-type pill ─────────────────────────────────────────────────

const ROAD_SUBTYPES: { type: AlertType; label: string; color: string }[] = [
  { type: 'pothole',          label: '🕳️ Potholes',          color: 'bg-[#4ef2bb]/15 text-[#4ef2bb] border-[#4ef2bb]/35' },
  { type: 'waterlogging',     label: '💧 Waterlogging',       color: 'bg-zinc-800 text-zinc-200 border-zinc-700' },
  { type: 'missing_signboard',label: '🚫 Missing Signboard',  color: 'bg-zinc-800 text-zinc-300 border-zinc-700' },
  { type: 'missing_crossing', label: '⬜ Missing Crossing',   color: 'bg-white/10 text-white border-white/20' },
];

const TRAFFIC_SUBTYPES: { type: AlertType; label: string; color: string }[] = [
  { type: 'bottleneck',           label: '🚦 Bottleneck',       color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { type: 'vehicle_density',      label: '🚗 High Density',      color: 'bg-white/10 text-white border-white/25' },
  { type: 'pedestrian_risk',      label: '🚶 Pedestrian Risk',   color: 'bg-[#4ef2bb]/15 text-[#4ef2bb] border-[#4ef2bb]/35' },
  { type: 'incident_hit_and_run', label: '🚨 Hit & Run',         color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
];

// ─── Table row ────────────────────────────────────────────────────────────────

function IncidentRow({ alert, index }: { alert: Alert; index: number }) {
  const vis = ALERT_VISUALS[alert.type];
  const statusVis = STATUS_VISUALS[alert.status];
  const { flyTo, setSelectedAlertId } = useAppStore();

  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, delay: index * 0.035 }}
      style={{ willChange: 'transform, opacity' }}
      onClick={() => { flyTo(alert.lat, alert.long); setSelectedAlertId(alert.id); }}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.025)' }}
      className="border-b border-white/[0.04] cursor-pointer group"
    >
      {/* Type */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 transition-shadow group-hover:shadow-md"
            style={{ background: `${vis.color}18`, border: `1px solid ${vis.color}33` }}
          >
            {vis.icon}
          </span>
          <div className="flex flex-col">
            <span className={cn('text-sm font-semibold', vis.textClass)}>{vis.label}</span>
            <span className="text-[10px] text-white/30 font-mono">{alert.id}</span>
          </div>
        </div>
      </td>

      {/* Confidence */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${alert.confidence * 100}%`,
                backgroundColor: alert.confidence >= 0.9 ? '#22c55e' : alert.confidence >= 0.75 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>
          <span className={cn('text-sm font-bold font-mono', confidenceColor(alert.confidence))}>
            {confidencePct(alert.confidence)}
          </span>
        </div>
      </td>

      {/* Bus */}
      <td className="px-4 py-3 font-mono text-xs text-white/55">{alert.bus_id}</td>

      {/* Time */}
      <td className="px-4 py-3 text-xs text-white/45">{timeAgo(alert.timestamp)}</td>

      {/* Location */}
      <td className="px-4 py-3 font-mono text-xs text-white/35">{formatGPS(alert.lat, alert.long)}</td>

      {/* Plate (road tab doesn't usually have plates, traffic/incident does) */}
      <td className="px-4 py-3">
        {alert.meta.plate_number
          ? <span className="font-mono text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5">{alert.meta.plate_number}</span>
          : <span className="text-white/20 text-xs">—</span>}
      </td>

      {/* Verified */}
      <td className="px-4 py-3">
        {alert.meta.verified_by_bus_count && alert.meta.verified_by_bus_count > 1
          ? <span className="text-xs text-[#4ef2bb] bg-[#4ef2bb]/15 border border-[#4ef2bb]/30 rounded px-2 py-0.5 font-mono">✓ {alert.meta.verified_by_bus_count} buses</span>
          : <span className="text-white/20 text-xs">—</span>}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span className={cn(
          'text-[11px] rounded-full px-2.5 py-1 font-semibold border',
          statusVis.bgClass, statusVis.textClass, statusVis.borderClass
        )}>
          {statusVis.label}
        </span>
      </td>
    </motion.tr>
  );
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-white/[0.04]">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="skeleton h-3 rounded w-full max-w-24" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function IncidentsPage() {
  const { alerts, setAlerts, isAlertsLoading, setAlertsLoading } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabId>('road');
  const [subFilter, setSubFilter] = useState<AlertType | 'all'>('all');

  useEffect(() => {
    setAlertsLoading(true);
    fetchAlerts().then(setAlerts).finally(() => setAlertsLoading(false));
  }, [setAlerts, setAlertsLoading]);

  // Reset sub-filter when tab changes
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setSubFilter('all');
  };

  const currentTab = TABS.find(t => t.id === activeTab)!;
  const currentSubtypes = activeTab === 'road' ? ROAD_SUBTYPES : TRAFFIC_SUBTYPES;

  const filtered = alerts.filter(a =>
    currentTab.types.includes(a.type) &&
    (subFilter === 'all' || a.type === subFilter)
  );

  const openCount    = filtered.filter(a => a.status === 'open').length;
  const ackCount     = filtered.filter(a => a.status === 'acknowledged').length;
  const resolvedCount = filtered.filter(a => a.status === 'resolved').length;

  const HEADERS = ['Type / ID', 'Confidence', 'Bus', 'Time', 'Location', 'Plate', 'Verified', 'Status'];

  return (
    <div className="flex-1 overflow-y-auto min-h-0 p-5 flex flex-col gap-4">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-xl font-bold text-white">Incident Reports</h1>
        <p className="text-sm text-white/35 mt-0.5">Click a row to fly to location on the map</p>
      </div>

      {/* ── Main tabs ── */}
      <div className="flex gap-3">
        {TABS.map((tab) => {
          const count = alerts.filter(a => tab.types.includes(a.type)).length;
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              style={{ willChange: 'transform' }}
              className={cn(
                'relative flex items-center gap-3 px-5 py-3 rounded-2xl border cursor-pointer transition-all text-left',
                isActive
                  ? cn(tab.bgColor, tab.borderColor)
                  : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.05]'
              )}
            >
              <span className="text-2xl">{tab.icon}</span>
              <div>
                <div className={cn('font-bold text-sm', isActive ? tab.color : 'text-white/60')}>
                  {tab.label}
                </div>
                <div className="text-[11px] text-white/35">{tab.description}</div>
              </div>
              {/* Count badge */}
              <span className={cn(
                'ml-auto min-w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold px-2',
                isActive ? cn(tab.color, 'bg-white/10') : 'text-white/30 bg-white/5'
              )}>
                {count}
              </span>
              {/* Active indicator line */}
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className={cn('absolute bottom-0 left-4 right-4 h-0.5 rounded-full', tab.bgColor.replace('/10', ''))}
                  style={{ willChange: 'transform' }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* ── Sub-type filter pills + stats row ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* All pill */}
        <motion.button
          onClick={() => setSubFilter('all')}
          whileTap={{ scale: 0.95 }}
          style={{ willChange: 'transform' }}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer',
            subFilter === 'all'
              ? cn(currentTab.bgColor, currentTab.color, currentTab.borderColor)
              : 'bg-white/[0.03] text-white/40 border-white/8 hover:text-white/60'
          )}
        >
          All
        </motion.button>

        {currentSubtypes.map(({ type, label, color }) => (
          <motion.button
            key={type}
            onClick={() => setSubFilter(type)}
            whileTap={{ scale: 0.95 }}
            style={{ willChange: 'transform' }}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer',
              subFilter === type
                ? cn(color, 'border')
                : 'bg-white/[0.03] text-white/40 border-white/8 hover:text-white/60'
            )}
          >
            {label}
          </motion.button>
        ))}

        {/* Spacer + stats */}
        <div className="ml-auto flex gap-2">
          <StatBadge label="Open"    value={openCount}     color="text-rose-400" />
          <StatBadge label="Pending" value={ackCount}      color="text-amber-400" />
          <StatBadge label="Resolved" value={resolvedCount} color="text-emerald-400" />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="glass rounded-2xl overflow-hidden shrink-0 mb-10">
        {/* Coloured top accent line */}
        <div className={cn('h-0.5', activeTab === 'road' ? 'bg-gradient-to-r from-transparent via-[#4ef2bb]/80 to-transparent' : 'bg-gradient-to-r from-transparent via-white/50 to-transparent')} />

        <div className="overflow-x-auto w-full">
          <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {HEADERS.map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {isAlertsLoading
                ? <SkeletonRows cols={HEADERS.length} />
                : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={HEADERS.length} className="px-4 py-16 text-center text-white/30 text-sm">
                        No {currentTab.label.toLowerCase()} alerts found
                      </td>
                    </tr>
                  )
                  : filtered.map((alert, i) => (
                      <IncidentRow key={alert.id} alert={alert} index={i} />
                    ))}
            </AnimatePresence>
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
