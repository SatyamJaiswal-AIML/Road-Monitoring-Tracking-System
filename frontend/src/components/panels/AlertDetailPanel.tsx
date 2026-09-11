import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ALERT_VISUALS,
  STATUS_VISUALS,
  confidencePct,
  confidenceColor,
  formatGPS,
  timeAgo,
  cn,
} from '../../lib/theme';
import { updateAlertStatus, downloadWorkOrderPdf } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { Alert, AlertStatus } from '../../types';
import { AdminAuthModal } from '../modals/AdminAuthModal';
import { AlertCameraSnapshot } from '../common/AlertCameraSnapshot';
import { RepairVerificationSlider } from '../common/RepairVerificationSlider';
import { calculateSLA, estimateRepairCost } from '../../lib/slaAndCost';

interface AlertDetailProps {
  alert: Alert | null;
  onClose: () => void;
}

export function AlertDetailPanel({ alert, onClose }: AlertDetailProps) {
  const { updateAlertStatus: localUpdate } = useAppStore();
  const [pendingStatus, setPendingStatus] = useState<AlertStatus | null>(null);
  const [showAuditSlider, setShowAuditSlider] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isResolved = alert?.status === 'resolved';
  const effectiveShowSlider = isResolved || showAuditSlider;

  const handleAction = (status: AlertStatus) => {
    if (!alert) return;
    setPendingStatus(status);
  };

  const handleExportPdf = async () => {
    if (!alert) return;
    setIsExporting(true);
    try {
      await downloadWorkOrderPdf(alert.id, alert);
    } finally {
      setIsExporting(false);
    }
  };

  const vis = alert ? ALERT_VISUALS[alert.type] : null;
  const statusVis = alert ? STATUS_VISUALS[alert.status] : null;

  return (
    <AnimatePresence>
      {alert && vis && statusVis && (
        <motion.div
          key={alert.id}
          initial={{ opacity: 0, y: 20, scale: 0.94, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: 15, scale: 0.95, filter: 'blur(6px)' }}
          transition={{
            type: 'spring',
            stiffness: 380,
            damping: 28,
          }}
          className="w-full max-h-[82vh] glass glass-accent rounded-2xl overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.85)] border border-white/[0.15] flex flex-col"
        >
          {/* Header - Fixed at top, always visible with bright Close (X) button */}
          <div
            className="px-5 py-3 flex items-center gap-3.5 border-b border-white/[0.1] shrink-0 sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md"
            style={{ background: `${vis.color}15` }}
          >
            <motion.span
              initial={{ rotate: -15, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="text-2xl drop-shadow"
            >
              {vis.icon}
            </motion.span>
            <div className="flex-1 min-w-0">
              <div className={cn('font-bold text-sm tracking-tight truncate', vis.textClass)}>
                {vis.label}
              </div>
              <div className="text-[11px] text-white/40 font-mono tracking-wider">{alert.id}</div>
            </div>
            <motion.button
              whileHover={{ scale: 1.15, rotate: 90 }}
              whileTap={{ scale: 0.85 }}
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/40 hover:border-rose-400 flex items-center justify-center text-rose-300 hover:text-white transition-all cursor-pointer text-sm font-bold shadow-[0_0_12px_rgba(244,63,94,0.35)] shrink-0"
              title="Close panel (Esc)"
            >
              ✕
            </motion.button>
          </div>

          {/* Scrollable Body & Footer Container */}
          <div className="overflow-y-auto flex-1 flex flex-col divide-y divide-white/[0.04]">

          {/* Body */}
          <div className="px-5 py-4 flex flex-col gap-3.5">
            {/* Animated Confidence Bar */}
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-white/50">AI Confidence Score</span>
                <span className={cn('font-bold font-mono text-sm', confidenceColor(alert.confidence))}>
                  {confidencePct(alert.confidence)}
                </span>
              </div>
              <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden p-0.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${alert.confidence * 100}%` }}
                  transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                  className="h-full rounded-full shadow-sm"
                  style={{ background: vis.color }}
                />
              </div>
            </div>

            {/* Edge Camera vs Closed-Loop Repair Audit View */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[11px] font-medium">
                <span className="text-white/50">
                  {effectiveShowSlider ? 'Closed-Loop Repair Audit' : 'Edge Dashcam Snapshot'}
                </span>
                
                {/* View Toggle */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowAuditSlider(!showAuditSlider)}
                    className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      effectiveShowSlider
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {effectiveShowSlider ? '📷 View Live Dashcam' : '🛡️ Audit Repair Slider'}
                  </button>
                  <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {effectiveShowSlider ? 'AUDITED' : 'AI CAPTURE'}
                  </span>
                </div>
              </div>

              {effectiveShowSlider ? (
                <RepairVerificationSlider alert={alert} />
              ) : (
                <AlertCameraSnapshot alert={alert} />
              )}
            </div>

            {/* Info Grid with Big Colorful Square PDF Button under Detection */}
            <div className="grid grid-cols-2 gap-3 bg-black/30 p-3 rounded-xl border border-white/[0.08]">
              {/* Left Column: Telemetry Specs */}
              <div className="flex flex-col justify-between gap-2.5">
                <div>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Bus Unit</span>
                  <div className="text-xs font-mono font-medium text-white/90">{alert.bus_id}</div>
                </div>

                <div>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">GPS Coords</span>
                  <div className="text-xs font-mono font-medium text-sky-400">{formatGPS(alert.lat, alert.long)}</div>
                </div>

                {alert.meta.plate_number && (
                  <div>
                    <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Plate (ANPR)</span>
                    <div className="text-xs font-mono font-bold text-amber-400">{alert.meta.plate_number}</div>
                  </div>
                )}

                <div>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Fleet Consensus</span>
                  <div className="text-xs font-medium text-emerald-400">
                    Verified by {alert.meta.verified_by_bus_count || 1} buses
                  </div>
                </div>
              </div>

              {/* Right Column: Detection + Big Colorful Square PDF Button */}
              <div className="flex flex-col gap-2">
                <div>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Detection</span>
                  <div className="text-xs font-medium text-white/85">{timeAgo(alert.timestamp)}</div>
                </div>

                {/* Big Square Colourful Eye-Catching PDF Button */}
                <motion.button
                  onClick={handleExportPdf}
                  disabled={isExporting}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  className="flex-1 min-h-[95px] rounded-xl relative overflow-hidden flex flex-col items-center justify-center p-2.5 text-center cursor-pointer transition-all border-2 border-amber-400/60 hover:border-amber-300 bg-gradient-to-br from-amber-500/25 via-orange-500/20 to-emerald-500/25 hover:from-amber-500/35 hover:to-emerald-500/35 shadow-[0_0_25px_rgba(245,158,11,0.3)] group disabled:opacity-50"
                  title="1-Click Official PWD Road Repair Tender PDF"
                >
                  <span className="text-2xl mb-1 filter drop-shadow">
                    {isExporting ? '⏳' : '📑'}
                  </span>

                  <span className="text-[11px] font-bold text-white tracking-wide leading-tight group-hover:text-amber-200 transition-colors">
                    {isExporting ? 'Generating...' : 'PWD WORK ORDER'}
                  </span>

                  <span className="text-[9px] font-mono text-amber-300 font-semibold tracking-wider mt-0.5">
                    1-CLICK PDF TENDER
                  </span>

                  <div className="mt-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/50 border border-amber-400/40 text-[8px] font-mono text-amber-300">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                    <span>SLA 48H • IRC:82</span>
                  </div>
                </motion.button>
              </div>
            </div>

            {/* 72-Hour Municipal SLA & PWD Repair Cost Widget */}
            {(() => {
              const sla = calculateSLA(alert);
              const cost = estimateRepairCost(alert);
              return (
                <div className="rounded-xl p-3 bg-gradient-to-br from-slate-900 to-black border border-white/10 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">Contractor 72h SLA:</span>
                    <span className={cn('text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border', sla.badgeClass)}>
                      {sla.badgeLabel}
                    </span>
                  </div>

                  {alert.type === 'pothole' && (
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Est. Repair Cost (CPWD DSR):</span>
                        <span className="text-sm font-black text-amber-400">₹{cost.totalCostInr.toLocaleString('en-IN')}</span>
                        <span className="text-[9px] text-slate-500 block">~{cost.estimatedAreaSqm} m² patch area</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          IRC:82 Cold Mix
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Status Pill */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-white/45 uppercase tracking-wider font-medium">Incident Status</span>
              <span
                className={cn(
                  'text-xs rounded-full px-3 py-1 font-semibold border',
                  statusVis.bgClass,
                  statusVis.textClass,
                  statusVis.borderClass
                )}
              >
                {statusVis.label}
              </span>
            </div>
          </div>

            {/* Action Buttons with Framer Motion Tap/Hover effects */}
            <div className="px-5 py-3.5 flex gap-2.5 bg-black/25 shrink-0">
              {alert.status === 'open' && (
                <motion.button
                  onClick={() => handleAction('acknowledged')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-all cursor-pointer shadow-sm"
                >
                  Acknowledge Alert
                </motion.button>
              )}
              {alert.status !== 'resolved' && (
                <motion.button
                  onClick={() => handleAction('resolved')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all cursor-pointer shadow-sm"
                >
                  ✓ Mark Resolved
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Admin Verification Modal */}
      {alert && pendingStatus && (
        <AdminAuthModal
          isOpen={pendingStatus !== null}
          onClose={() => setPendingStatus(null)}
          targetAlertId={alert.id}
          targetStatus={pendingStatus}
          onConfirm={async (_officerId) => {
            await updateAlertStatus(alert.id, pendingStatus);
            localUpdate(alert.id, pendingStatus);
          }}
        />
      )}
    </AnimatePresence>
  );
}
