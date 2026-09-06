import { useEffect, useRef } from 'react';
import { motion, animate, useMotionValue } from 'framer-motion';
import { cn } from '../../lib/theme';
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
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  icon: string;
  color: string;
  bg: string;
  beamGradient: string;
  delay: number;
  trend: string;
}

interface Props {
  summary: AnalyticsSummary | null;
  isLoading: boolean;
}

export function FloatingMetricCards({ summary, isLoading }: Props) {
  const cards: CardDef[] = summary ? [
    {
      label: 'Open Defects',
      value: summary.open_defects,
      icon: '🕳️',
      color: 'text-[#4ef2bb]',
      bg: 'bg-[#4ef2bb]/10 border-[#4ef2bb]/30',
      beamGradient: 'from-transparent via-[#4ef2bb] to-transparent',
      delay: 0,
      trend: '+12 today',
    },
    {
      label: 'Active Incidents',
      value: summary.active_incidents,
      icon: '🚨',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
      beamGradient: 'from-transparent via-rose-400 to-transparent',
      delay: 0.06,
      trend: 'ANPR live',
    },
    {
      label: 'Avg Fleet Delay',
      value: summary.avg_route_delay_min,
      suffix: 'm',
      decimals: 1,
      icon: '⏱️',
      color: 'text-white',
      bg: 'bg-white/5 border-white/15',
      beamGradient: 'from-transparent via-white/80 to-transparent',
      delay: 0.12,
      trend: 'vs schedule',
    },
    {
      label: 'Bandwidth Saved',
      value: summary.bandwidth_saved_pct,
      suffix: '%',
      decimals: 2,
      icon: '📡',
      color: 'text-[#4ef2bb]',
      bg: 'bg-[#4ef2bb]/10 border-[#4ef2bb]/30',
      beamGradient: 'from-transparent via-[#4ef2bb] to-transparent',
      delay: 0.18,
      trend: '80,000x edge AI',
    },
  ] : [];

  return (
    <div className="flex flex-col gap-3">
      {isLoading || !summary
        ? [0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton w-52 h-[72px] rounded-2xl" />
          ))
        : cards.map((card) => (
            <div
              key={card.label}
              className="relative p-[1px] rounded-2xl overflow-hidden group w-52"
            >
              {/* ── 21st.dev Traveling Glowing Border Beam ── */}
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
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative bg-[#0d121c]/90 backdrop-blur-xl border border-white/[0.08] group-hover:border-transparent flex items-center justify-between px-3.5 py-3 rounded-[15px] cursor-pointer shadow-lg transition-colors duration-200 select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <motion.div
                    whileHover={{ rotate: 15, scale: 1.15 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 15 }}
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border shadow-inner',
                      card.bg
                    )}
                  >
                    {card.icon}
                  </motion.div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-white/45 uppercase tracking-wider font-semibold leading-none mb-1 truncate">
                      {card.label}
                    </span>
                    <AnimatedNumber
                      value={card.value}
                      suffix={card.suffix}
                      decimals={card.decimals}
                      className={cn('text-xl font-black tabular-nums leading-none tracking-tight font-mono', card.color)}
                    />
                  </div>
                </div>

                {/* Trend Tag */}
                <span className="text-[9px] font-mono text-white/30 group-hover:text-white/60 transition-colors shrink-0 text-right leading-tight">
                  {card.trend}
                </span>
              </motion.div>
            </div>
          ))}
    </div>
  );
}
