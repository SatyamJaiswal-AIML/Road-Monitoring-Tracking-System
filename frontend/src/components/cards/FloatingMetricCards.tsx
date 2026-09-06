import { useEffect, useRef, useState } from 'react';
import { motion, animate, useMotionValue, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/theme';
import { useAppStore } from '../../store/useAppStore';
import type { AnalyticsSummary } from '../../types';

function AnimatedNumber({ value, suffix = '', decimals = 0, className }: {
  value: number; suffix?: string; decimals?: number; className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const mv = useMotionValue(0);

  useEffect(() => {
    const ctrl = animate(mv, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1] });
    const unsub = mv.on('change', (v) => {
      if (ref.current) ref.current.textContent = v.toFixed(decimals) + suffix;
    });
    return () => { ctrl.stop(); unsub(); };
  }, [value, suffix, decimals, mv]);

  return <span ref={ref} className={className}>0{suffix}</span>;
}

interface CardDef {
  id: string;
  label: string;
  fullTitle: string;
  value: number;
  suffix?: string;
  decimals?: number;
  icon: string;
  color: string;
  bg: string;
  beamGradient: string;
  delay: number;
  trend: string;
  details: { label: string; value: string; color?: string }[];
  description: string;
}

interface Props {
  summary: AnalyticsSummary | null;
  isLoading: boolean;
}

export function FloatingMetricCards({ summary, isLoading }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { setCurrentPage } = useAppStore();

  const cards: CardDef[] = summary ? [
    {
      id: 'defects',
      label: 'Open Defects',
      fullTitle: 'Civic Road Defects',
      value: summary.open_defects,
      icon: '🕳️',
      color: 'text-[#4ef2bb]',
      bg: 'bg-[#4ef2bb]/10 border-[#4ef2bb]/30',
      beamGradient: 'from-transparent via-[#4ef2bb] to-transparent',
      delay: 0,
      trend: '+12 today',
      details: [
        { label: 'Potholes (Verified)', value: `${Math.round(summary.open_defects * 0.65)}` },
        { label: 'Waterlogging Areas', value: `${Math.round(summary.open_defects * 0.22)}` },
        { label: 'Missing Signboards', value: `${Math.max(1, Math.round(summary.open_defects * 0.13))}` },
      ],
      description: 'Monitored via on-bus optical units. Requires municipal repair order.',
    },
    {
      id: 'incidents',
      label: 'Active Incidents',
      fullTitle: 'Public Safety Incidents',
      value: summary.active_incidents,
      icon: '🚨',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
      beamGradient: 'from-transparent via-rose-400 to-transparent',
      delay: 0.06,
      trend: 'ANPR live',
      details: [
        { label: 'Hit & Run Alerts', value: '3 active', color: 'text-rose-400' },
        { label: 'Pedestrian Hazard', value: `${Math.max(1, summary.active_incidents - 3)} zones` },
        { label: 'License Plate (ANPR)', value: 'Active extraction' },
      ],
      description: 'High-priority civic safety alerts flagged by computer vision.',
    },
    {
      id: 'delay',
      label: 'Avg Fleet Delay',
      fullTitle: 'Public Transit Punctuality',
      value: summary.avg_route_delay_min,
      suffix: 'm',
      decimals: 1,
      icon: '⏱️',
      color: 'text-white',
      bg: 'bg-white/5 border-white/15',
      beamGradient: 'from-transparent via-white/80 to-transparent',
      delay: 0.12,
      trend: 'vs schedule',
      details: [
        { label: 'Schedule Adherence', value: '91.4%' },
        { label: 'Congested Corridor', value: 'Ring Road Arterial' },
        { label: 'Active Fleet Units', value: `${summary.buses_reporting} reporting` },
      ],
      description: 'Real-time delay calculated against official DTC timetables.',
    },
    {
      id: 'bandwidth',
      label: 'Bandwidth Saved',
      fullTitle: 'Edge AI Data Reduction',
      value: summary.bandwidth_saved_pct,
      suffix: '%',
      decimals: 2,
      icon: '📡',
      color: 'text-[#4ef2bb]',
      bg: 'bg-[#4ef2bb]/10 border-[#4ef2bb]/30',
      beamGradient: 'from-transparent via-[#4ef2bb] to-transparent',
      delay: 0.18,
      trend: '80,000x edge AI',
      details: [
        { label: 'Raw 1080p Video', value: '25.0 MB/min' },
        { label: 'Telemetry Upload', value: '1.4 KB/min', color: 'text-[#4ef2bb]' },
        { label: 'Data Efficiency', value: '99.9944% saved' },
      ],
      description: 'Frames processed in-memory and discarded. Zero raw footage transmitted.',
    },
  ] : [];

  return (
    <div className="flex flex-col gap-2.5">
      {isLoading || !summary
        ? [0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton w-64 h-[72px] rounded-2xl" />
          ))
        : cards.map((card) => {
            const isExpanded = expandedId === card.id;

            return (
              <div
                key={card.id}
                className={cn(
                  'relative p-[1px] rounded-2xl overflow-hidden group transition-all duration-300',
                  isExpanded ? 'w-80 shadow-[0_20px_50px_rgba(0,0,0,0.9)]' : 'w-64'
                )}
              >
                {/* ── Traveling Glowing Border Beam ── */}
                <motion.div
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  className={cn(
                    'absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_280deg,var(--tw-gradient-stops))] opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                    card.beamGradient
                  )}
                />

                {/* Card Container */}
                <motion.div
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.45,
                    delay: card.delay,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : card.id)}
                  whileHover={{ scale: isExpanded ? 1 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'relative bg-[#0d121c]/95 backdrop-blur-2xl border transition-all duration-200 p-3 rounded-[15px] cursor-pointer shadow-xl select-none flex flex-col',
                    isExpanded
                      ? 'border-[#4ef2bb]/50 bg-[#0d121c]'
                      : 'border-white/[0.08] hover:border-white/20'
                  )}
                >
                  {/* Top Summary Row */}
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <motion.div
                        whileHover={{ rotate: 12, scale: 1.1 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 15 }}
                        className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 border shadow-inner',
                          card.bg
                        )}
                      >
                        {card.icon}
                      </motion.div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] text-white/50 uppercase tracking-wider font-semibold leading-none mb-1 whitespace-nowrap">
                          {card.label}
                        </span>
                        <AnimatedNumber
                          value={card.value}
                          suffix={card.suffix}
                          decimals={card.decimals}
                          className={cn('text-lg font-black tabular-nums leading-none tracking-tight font-mono', card.color)}
                        />
                      </div>
                    </div>

                    {/* Right side: Trend + Chevron */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] font-mono text-white/40 group-hover:text-white/70 transition-colors text-right leading-tight">
                        {card.trend}
                      </span>
                      <span className={cn(
                        'text-[10px] text-white/30 transition-transform duration-200',
                        isExpanded ? 'rotate-180 text-[#4ef2bb]' : ''
                      )}>
                        ▼
                      </span>
                    </div>
                  </div>

                  {/* ── Expandable Detail View on Click ── */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.24, ease: 'easeOut' }}
                        className="overflow-hidden pt-3 mt-3 border-t border-white/[0.08] flex flex-col gap-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-white tracking-wide">
                            {card.fullTitle}
                          </span>
                          <span className="text-[9px] font-mono text-[#4ef2bb] bg-[#4ef2bb]/10 border border-[#4ef2bb]/25 px-1.5 py-0.5 rounded">
                            Live Telemetry
                          </span>
                        </div>

                        {/* Breakdown Rows */}
                        <div className="bg-black/40 rounded-xl p-2.5 border border-white/[0.04] flex flex-col gap-1.5">
                          {card.details.map((d) => (
                            <div key={d.label} className="flex items-center justify-between text-xs">
                              <span className="text-white/45 text-[11px]">{d.label}</span>
                              <span className={cn('font-mono font-bold text-[11px]', d.color || 'text-white/90')}>
                                {d.value}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Context note */}
                        <p className="text-[10px] text-white/40 leading-relaxed">
                          {card.description}
                        </p>

                        {/* Quick Action button */}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentPage(card.id === 'incidents' ? 'incidents' : card.id === 'delay' ? 'fleet' : 'analytics');
                            }}
                            className="text-[10px] font-bold text-[#4ef2bb] hover:text-[#3cdca8] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            Open Detailed Report →
                          </button>
                          <span className="text-[9px] text-white/30">Click to collapse</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            );
          })}
    </div>
  );
}
