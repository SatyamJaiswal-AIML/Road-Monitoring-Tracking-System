import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import {
  ALERT_VISUALS, STATUS_VISUALS, confidencePct, confidenceColor,
  formatGPS, timeAgo, cn,
} from '../lib/theme';
import type { Alert, AlertType, AlertStatus } from '../types';
import { fetchAlerts, updateAlertStatus, downloadWorkOrderPdf } from '../lib/api';
import { AdminAuthModal } from '../components/modals/AdminAuthModal';
import { AlertDetailPanel } from '../components/panels/AlertDetailPanel';
import { AlertCameraSnapshot } from '../components/common/AlertCameraSnapshot';
import { RepairVerificationSlider } from '../components/common/RepairVerificationSlider';

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

// ─── Table row with Expand on Click ──────────────────────────────────────────

interface IncidentRowProps {
  alert: Alert;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  headersCount: number;
  onStatusRequest: (alertId: string, newStatus: AlertStatus) => void;
  onInspect: (alert: Alert) => void;
}

function IncidentRow({ alert, index, isExpanded, onToggle, headersCount, onStatusRequest, onInspect }: IncidentRowProps) {
  const vis = ALERT_VISUALS[alert.type];
  const statusVis = STATUS_VISUALS[alert.status];
  const { flyTo, setSelectedAlertId, setCurrentPage } = useAppStore();

  const handleStatusChange = (e: React.MouseEvent, newStatus: AlertStatus) => {
    e.stopPropagation();
    onStatusRequest(alert.id, newStatus);
  };

  const handleViewOnMap = (e: React.MouseEvent) => {
    e.stopPropagation();
    flyTo(alert.lat, alert.long);
    setSelectedAlertId(alert.id);
    setCurrentPage('dashboard');
  };

  const isResolved = alert.status === 'resolved';

  return (
    <>
      <motion.tr
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, delay: index * 0.025 }}
        style={{ willChange: 'transform, opacity' }}
        onClick={() => onInspect(alert)}
        whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
        className={cn(
          'border-b border-white/[0.04] cursor-pointer group transition-colors select-none',
          isExpanded ? 'bg-white/[0.04] border-l-2 border-[#4ef2bb]' : ''
        )}
      >
        {/* Type */}
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span
              className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 transition-shadow group-hover:shadow-md"
              style={{ background: `${vis.color}18`, border: `1px solid ${vis.color}33` }}
            >
              {vis.icon}
            </span>
            <div className="flex flex-col">
              <span className={cn('text-sm font-semibold flex items-center gap-1.5', vis.textClass)}>
                {vis.label}
              </span>
              <span className="text-[10px] text-white/30 font-mono">{alert.id}</span>
            </div>
          </div>
        </td>

        {/* Confidence */}
        <td className="px-4 py-3.5">
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
        <td className="px-4 py-3.5 font-mono text-xs text-white/55">{alert.bus_id}</td>

        {/* Time */}
        <td className="px-4 py-3.5 text-xs text-white/45">{timeAgo(alert.timestamp)}</td>

        {/* Location */}
        <td className="px-4 py-3.5 font-mono text-xs text-white/35">{formatGPS(alert.lat, alert.long)}</td>

        {/* Plate */}
        <td className="px-4 py-3.5">
          {alert.meta.plate_number
            ? <span className="font-mono text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5">{alert.meta.plate_number}</span>
            : <span className="text-white/20 text-xs">—</span>}
        </td>

        {/* Verified */}
        <td className="px-4 py-3.5">
          {alert.meta.verified_by_bus_count && alert.meta.verified_by_bus_count > 1
            ? <span className="text-xs text-[#4ef2bb] bg-[#4ef2bb]/15 border border-[#4ef2bb]/30 rounded px-2 py-0.5 font-mono">✓ {alert.meta.verified_by_bus_count} buses</span>
            : <span className="text-white/20 text-xs">—</span>}
        </td>

        {/* Status + Quick Inspect + Expand indicator */}
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-[11px] rounded-full px-2.5 py-1 font-semibold border shrink-0',
              statusVis.bgClass, statusVis.textClass, statusVis.borderClass
            )}>
              {statusVis.label}
            </span>

            {/* Direct 1-Click Inspect & PDF Work Order Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInspect(alert);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition-all cursor-pointer shadow-sm hover:scale-105 shrink-0"
              title="Open inspection dialogue box with photo & PWD PDF tender"
            >
              <span>📑</span>
              <span className="hidden sm:inline">Inspect & PDF</span>
            </button>

            {/* Expand / Collapse Chevron */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className={cn(
                'text-xs text-white/40 p-1 rounded hover:bg-white/10 transition-transform duration-200 group-hover:text-white ml-auto cursor-pointer',
                isExpanded ? 'rotate-180 text-[#4ef2bb]' : ''
              )}
              title={isExpanded ? 'Collapse inline preview' : 'Expand inline preview'}
            >
              ▼
            </button>
          </div>
        </td>
      </motion.tr>

      {/* ── Expanded Detail Drawer ── */}
      {isExpanded && (
        <tr className="bg-black/60 border-b border-white/[0.08]">
          <td colSpan={headersCount} className="p-0">
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="overflow-hidden p-5 flex flex-col gap-4 border-l-2 border-[#4ef2bb] bg-gradient-to-r from-[#4ef2bb]/[0.04] to-transparent"
            >
              {/* Top Bar */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-2 rounded-xl bg-white/[0.05] border border-white/[0.1]">{vis.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-base font-bold', vis.textClass)}>{vis.label}</span>
                      <span className="font-mono text-xs text-white/40">{alert.id}</span>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-semibold', statusVis.bgClass, statusVis.textClass, statusVis.borderClass)}>
                        {statusVis.label}
                      </span>
                    </div>
                    <div className="text-xs text-white/50 mt-0.5">
                      Captured by on-board sensing unit <span className="font-mono text-white/80">{alert.bus_id}</span> • {timeAgo(alert.timestamp)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onInspect(alert); }}
                    className="px-3 py-1 rounded-lg text-xs font-semibold text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>🔍</span> Open Full Dialogue Box
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggle(); }}
                    className="px-3 py-1 rounded-lg text-xs text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                  >
                    ▲ Collapse
                  </button>
                </div>
              </div>

              {/* Dashcam Photo & Telemetry Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left: Dashcam Snapshot / Repair Audit Slider (5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-white/50">
                      {isResolved ? 'Closed-Loop Repair Audit' : 'Edge Dashcam Snapshot'}
                    </span>
                    <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {isResolved ? 'AUDITED' : 'AI CAPTURE'}
                    </span>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-inner">
                    {isResolved ? (
                      <RepairVerificationSlider alert={alert} />
                    ) : (
                      <AlertCameraSnapshot alert={alert} compact={false} />
                    )}
                  </div>
                </div>

                {/* Right: Telemetry Specs & PWD Work Order PDF Button (7 cols) */}
                <div className="lg:col-span-7 flex flex-col justify-between gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Confidence Card */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/40 uppercase font-semibold text-[10px]">AI Confidence</span>
                        <span className={cn('font-bold font-mono text-xs', confidenceColor(alert.confidence))}>
                          {confidencePct(alert.confidence)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${alert.confidence * 100}%`,
                            backgroundColor: alert.confidence >= 0.9 ? '#22c55e' : alert.confidence >= 0.75 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-white/50">
                        {alert.meta?.verified_by_bus_count && alert.meta.verified_by_bus_count > 1 ? (
                          <span className="text-[#4ef2bb] font-mono">✓ {alert.meta.verified_by_bus_count} buses</span>
                        ) : (
                          <span className="text-zinc-400">Single bus</span>
                        )}
                      </span>
                    </div>

                    {/* GPS Card */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-1">
                      <span className="text-white/40 uppercase font-semibold text-[10px]">GPS Coords</span>
                      <div className="font-mono text-xs text-sky-400">
                        {formatGPS(alert.lat, alert.long)}
                      </div>
                      <span className="text-[10px] text-white/30 font-mono">
                        {alert.lat.toFixed(4)}°N, {alert.long.toFixed(4)}°E
                      </span>
                    </div>

                    {/* Edge Metadata */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-1">
                      <span className="text-white/40 uppercase font-semibold text-[10px]">Edge Metadata</span>
                      {alert.meta?.plate_number ? (
                        <span className="font-mono text-amber-400 font-bold text-xs bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 truncate">
                          {alert.meta.plate_number}
                        </span>
                      ) : alert.meta?.vehicle_count ? (
                        <span className="text-xs text-white font-mono font-bold">
                          {alert.meta.vehicle_count} units
                        </span>
                      ) : (
                        <span className="text-xs text-[#4ef2bb] font-mono">
                          {alert.type}
                        </span>
                      )}
                      <span className="text-[10px] text-white/40">DPDP Protected</span>
                    </div>
                  </div>

                  {/* 1-Click PWD Work Order PDF Button */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-emerald-500/15 border border-amber-400/40">
                    <div className="text-3xl">📑</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>PWD OFFICIAL ROAD REPAIR WORK ORDER</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          SLA 48H • IRC:82
                        </span>
                      </div>
                      <div className="text-[11px] text-white/60">
                        Generate official tender PDF with GPS, timestamp, bus ID & contractor compliance terms.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadWorkOrderPdf(alert.id, alert);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-400 text-black hover:bg-amber-300 transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.4)] shrink-0 flex items-center gap-1.5"
                    >
                      <span>📑</span>
                      <span>Generate PDF</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06] flex-wrap">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspect(alert);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <span>🔍</span> Open Inspection Dialogue Box
                </button>

                {alert.status === 'open' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspect(alert);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>⚡</span> Acknowledge Alert
                  </button>
                )}
                {alert.status !== 'resolved' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspect(alert);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>✓</span> Mark as Resolved
                  </button>
                )}
                {alert.status === 'resolved' && (
                  <button
                    type="button"
                    onClick={(e) => handleStatusChange(e, 'open')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 text-white/70 border border-white/15 hover:bg-white/15 transition-all cursor-pointer"
                  >
                    Reopen Alert
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleViewOnMap}
                  className="ml-auto flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-[#4ef2bb] text-black hover:bg-[#3cdca8] transition-all cursor-pointer shadow-[0_0_20px_rgba(78,242,187,0.3)]"
                >
                  <span>📍</span> View & Fly to 3D Map
                </button>
              </div>
            </motion.div>
          </td>
        </tr>
      )}
    </>
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
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [inspectAlertId, setInspectAlertId] = useState<string | null>(null);
  const [authModal, setAuthModal] = useState<{ alertId: string; targetStatus: AlertStatus } | null>(null);

  const inspectAlert = alerts.find((a) => a.id === inspectAlertId) || null;

  useEffect(() => {
    setAlertsLoading(true);
    fetchAlerts().then(setAlerts).finally(() => setAlertsLoading(false));
  }, [setAlerts, setAlertsLoading]);

  // Reset sub-filter when tab changes
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setSubFilter('all');
    setExpandedAlertId(null);
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
                      <IncidentRow
                        key={alert.id}
                        alert={alert}
                        index={i}
                        isExpanded={expandedAlertId === alert.id}
                        onToggle={() => setExpandedAlertId(expandedAlertId === alert.id ? null : alert.id)}
                        headersCount={HEADERS.length}
                        onStatusRequest={(alertId, newStatus) => setAuthModal({ alertId, targetStatus: newStatus })}
                        onInspect={(a) => setInspectAlertId(a.id)}
                      />
                    ))}
            </AnimatePresence>
          </tbody>
        </table>
        </div>
      </div>

      {/* ── Inspection & PWD Work Order Dialogue Box Modal (Exact same as Map View) ── */}
      {inspectAlert && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm pointer-events-auto">
          <div className="w-[440px] max-w-[95vw] max-h-full flex flex-col">
            <AlertDetailPanel
              alert={inspectAlert}
              onClose={() => setInspectAlertId(null)}
            />
          </div>
        </div>
      )}

      {/* Admin Verification Modal */}
      {authModal && (
        <AdminAuthModal
          isOpen={authModal !== null}
          onClose={() => setAuthModal(null)}
          targetAlertId={authModal.alertId}
          targetStatus={authModal.targetStatus}
          onConfirm={async (_officerId) => {
            await updateAlertStatus(authModal.alertId, authModal.targetStatus);
            useAppStore.getState().updateAlertStatus(authModal.alertId, authModal.targetStatus);
          }}
        />
      )}
    </div>
  );
}
