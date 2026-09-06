import { useEffect, useRef } from 'react';
import { motion, useMotionValue, animate } from 'motion/react';
import { cn } from '../../lib/theme';
import type { AnalyticsSummary } from '../../types';

// ─── Animated count-up number ────────────────────────────────────────────────

function AnimatedNumber({
  value,
  suffix = '',
  decimals = 0,
  className,
}: {
  value: number;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(0);

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration: 1.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    });
    const unsub = motionVal.on('change', (v) => {
      if (ref.current) {
        ref.current.textContent = v.toFixed(decimals) + suffix;
      }
    });
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, suffix, decimals, motionVal]);

  return (
    <span ref={ref} className={className}>
      0{suffix}
    </span>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-4 flex flex-col gap-3">
      <div className="skeleton h-3 w-20 rounded-full" />
      <div className="skeleton h-8 w-16 rounded-md" />
      <div className="skeleton h-2 w-24 rounded-full" />
    </div>
  );
}

// ─── Single metric card ───────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  icon: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  trend?: string;
  delay?: number;
}

function MetricCard({
  label, value, suffix, decimals = 0,
  icon, colorClass, bgClass, borderClass,
  trend, delay = 0,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ willChange: 'transform, opacity' }}
      whileHover={{
        scale: 1.03,
        boxShadow: '0 0 24px rgba(0,212,255,0.15)',
        transition: { duration: 0.2 },
      }}
      className={cn(
        'glass rounded-2xl p-4 flex flex-col gap-2 cursor-default',
        `border ${borderClass}`
      )}
    >
      {/* Icon + label */}
      <div className="flex items-center gap-2">
        <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-sm', bgClass)}>
          {icon}
        </span>
        <span className="text-xs text-white/50 font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>

      {/* Value */}
      <AnimatedNumber
        value={value}
        suffix={suffix}
        decimals={decimals}
        className={cn('text-3xl font-bold tabular-nums', colorClass)}
      />

      {/* Trend */}
      {trend && (
        <span className="text-xs text-white/30">{trend}</span>
      )}
    </motion.div>
  );
}

// ─── Metric card row ─────────────────────────────────────────────────────────

interface MetricCardsProps {
  summary: AnalyticsSummary | null;
  isLoading: boolean;
}

export function MetricCards({ summary, isLoading }: MetricCardsProps) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 p-4">
        {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const cards: MetricCardProps[] = [
    {
      label: 'Open Defects',
      value: summary.open_defects,
      icon: '🕳️',
      colorClass: 'text-orange-400',
      bgClass: 'bg-orange-500/10',
      borderClass: 'border-orange-500/20',
      trend: `${summary.total_alerts_today} alerts today`,
      delay: 0,
    },
    {
      label: 'Active Incidents',
      value: summary.active_incidents,
      icon: '🚨',
      colorClass: 'text-red-400',
      bgClass: 'bg-red-500/10',
      borderClass: 'border-red-500/20',
      trend: 'Hit & run + rash driving',
      delay: 0.07,
    },
    {
      label: 'Avg Route Delay',
      value: summary.avg_route_delay_min,
      suffix: ' min',
      decimals: 1,
      icon: '⏱️',
      colorClass: 'text-amber-400',
      bgClass: 'bg-amber-500/10',
      borderClass: 'border-amber-500/20',
      trend: 'Fleet average',
      delay: 0.14,
    },
    {
      label: 'Bandwidth Saved',
      value: summary.bandwidth_saved_pct,
      suffix: '%',
      decimals: 2,
      icon: '📡',
      colorClass: 'text-cyan-400 text-glow-cyan',
      bgClass: 'bg-cyan-500/10',
      borderClass: 'border-cyan-500/20',
      trend: 'Edge vs raw video upload',
      delay: 0.21,
    },
  ];



  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 p-4">
      {cards.map((card) => (
        <MetricCard key={card.label} {...card} />
      ))}
    </div>
  );
}
