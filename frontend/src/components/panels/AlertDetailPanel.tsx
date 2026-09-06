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
import { updateAlertStatus } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import type { Alert, AlertStatus } from '../../types';

interface AlertDetailProps {
  alert: Alert | null;
  onClose: () => void;
}

export function AlertDetailPanel({ alert, onClose }: AlertDetailProps) {
  const { updateAlertStatus: localUpdate } = useAppStore();

  const handleAction = async (status: AlertStatus) => {
    if (!alert) return;
    await updateAlertStatus(alert.id, status);
    localUpdate(alert.id, status);
  };

  const vis = alert ? ALERT_VISUALS[alert.type] : null;
  const statusVis = alert ? STATUS_VISUALS[alert.status] : null;

  return (
    <AnimatePresence>
      {alert && vis && statusVis && (
        <motion.div
          key={alert.id}
          initial={{ opacity: 0, y: 35, scale: 0.92, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: 25, scale: 0.94, filter: 'blur(6px)' }}
          transition={{
            type: 'spring',
            stiffness: 380,
            damping: 28,
          }}
          className="w-full glass glass-accent rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)] border border-white/[0.12]"
        >
          {/* Header */}
          <div
            className="px-5 py-3.5 flex items-center gap-3.5 border-b border-white/[0.08]"
            style={{ background: `${vis.color}0d` }}
          >
            <motion.span
              initial={{ rotate: -15, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="text-2xl drop-shadow"
            >
              {vis.icon}
            </motion.span>
            <div className="flex-1">
              <div className={cn('font-bold text-sm tracking-tight', vis.textClass)}>
                {vis.label}
              </div>
              <div className="text-[11px] text-white/40 font-mono tracking-wider">{alert.id}</div>
            </div>
            <motion.button
              whileHover={{ scale: 1.15, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer text-xs"
            >
              ✕
            </motion.button>
          </div>

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

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-2.5 bg-black/20 p-3 rounded-xl border border-white/[0.04]">
              {[
                { label: 'Bus Unit', value: alert.bus_id, mono: true },
                { label: 'Detection', value: timeAgo(alert.timestamp), mono: false },
                { label: 'GPS Coords', value: formatGPS(alert.lat, alert.long), mono: true, span: 2 },
                ...(alert.meta.plate_number
                  ? [{ label: 'License Plate (ANPR)', value: alert.meta.plate_number, mono: true, span: 2, highlight: true }]
                  : []),
                ...(alert.meta.vehicle_count
                  ? [{ label: 'Estimated Vehicles', value: `${alert.meta.vehicle_count} units`, mono: false }]
                  : []),
                ...(alert.meta.verified_by_bus_count
                  ? [{ label: 'Fleet Consensus', value: `Verified by ${alert.meta.verified_by_bus_count} buses`, mono: false }]
                  : []),
              ].map(({ label, value, mono, span, highlight }: any) => (
                <div key={label} className={cn('flex flex-col gap-0.5', span === 2 ? 'col-span-2' : '')}>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{label}</span>
                  <span
                    className={cn(
                      'text-xs font-medium',
                      mono && 'font-mono',
                      highlight ? 'text-amber-400 font-bold tracking-wider' : 'text-white/85'
                    )}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

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
          <div className="px-5 pb-4 flex gap-2.5">
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
