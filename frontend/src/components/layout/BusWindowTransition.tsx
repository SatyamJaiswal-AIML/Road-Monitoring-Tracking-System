import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { DashboardPage } from '../../types';

interface BusWindowTransitionProps {
  page: DashboardPage;
}

const PAGE_META: Record<DashboardPage, { title: string; route: string; sensor: string; speed: string }> = {
  dashboard: { title: 'MAIN FLEET RADAR', route: 'FLEET ROUTE 42 // CONNAUGHT PLACE', sensor: 'SCANNING POTHOLES & DENSITY', speed: '48 KM/H' },
  incidents: { title: 'AI HAZARD DETECTOR', route: 'RAPID RESPONSE // DANGER CORRIDORS', sensor: 'ANPR + INCIDENT TRACKER', speed: '52 KM/H' },
  analytics: { title: 'URBAN INTELLIGENCE HUB', route: 'CENTRAL AGGREGATOR ENGINE', sensor: 'OD PATTERNS & DELAYS', speed: '40 KM/H' },
  fleet:     { title: 'FLEET TRACKING DOCK', route: '42 ACTIVE ON-BOARD UNITS', sensor: 'GPS TELEMETRY & MESH', speed: 'LIVE' },
};

export function BusWindowTransition({ page }: BusWindowTransitionProps) {
  const [active, setActive] = useState(true);
  const meta = PAGE_META[page] || PAGE_META.dashboard;

  useEffect(() => {
    setActive(true);
    const timer = setTimeout(() => {
      setActive(false);
    }, 750);
    return () => clearTimeout(timer);
  }, [page]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key={`bus-${page}`}
          initial={{ opacity: 1 }}
          animate={{ opacity: [1, 1, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.72, times: [0, 0.7, 1], ease: 'easeOut' }}
          className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden flex items-center justify-center bg-[#020611]/90 backdrop-blur-[2px]"
        >
      {/* ── Bus 3D Cockpit & Windshield ── */}
      <motion.div
        initial={{ scale: 0.65, z: -100, rotateX: 6 }}
        animate={{ scale: 3.2, z: 250, rotateX: 0 }}
        transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-[90vw] h-[82vh] rounded-[36px] flex flex-col justify-between p-6 border-[28px] border-[#0c1322] shadow-[0_0_120px_rgba(0,0,0,0.9),inset_0_0_80px_rgba(0,0,0,0.95)] bg-gradient-to-b from-[#0a1224]/80 via-transparent to-[#050914]"
        style={{
          boxShadow: '0 0 0 12px #040814, 0 20px 80px rgba(0,212,255,0.25), inset 0 0 60px rgba(0,0,0,0.9)',
        }}
      >
        {/* ── Top destination LED display ── */}
        <div className="w-full flex items-center justify-between px-6 py-3 bg-[#02050e] border-2 border-cyan-400/60 rounded-xl shadow-[0_0_30px_rgba(0,212,255,0.4)]">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-mono text-xs md:text-sm font-black tracking-[0.28em] text-cyan-300">
              BEL URBAN BUS // {meta.route}
            </span>
          </div>
          <span className="font-mono text-xs text-emerald-400 font-bold tracking-widest animate-pulse">
            ● AI RECORDER ACTIVE
          </span>
        </div>

        {/* ── Center Windshield Crosshair HUD ── */}
        <div className="self-center flex flex-col items-center gap-3">
          <motion.div
            initial={{ scale: 0.8, opacity: 0.9 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 0.95 }}
            className="w-48 h-48 rounded-full border-2 border-dashed border-cyan-400/60 flex items-center justify-center relative"
          >
            <div className="w-32 h-32 rounded-full border border-cyan-400/80 animate-spin" />
            <div className="absolute w-full h-0.5 bg-cyan-400/60" />
            <div className="absolute h-full w-0.5 bg-cyan-400/60" />
            <span className="font-mono text-xs text-cyan-300 font-bold bg-black/80 px-2 py-0.5 border border-cyan-400/40 rounded">
              {meta.title}
            </span>
          </motion.div>
          <span className="font-mono text-xs tracking-[0.3em] text-cyan-400/80 uppercase font-semibold">
            ENTERING SENSING SECTOR...
          </span>
        </div>

        {/* ── Bottom Bus Dashboard & Steering Cowl ── */}
        <div className="w-full flex items-end justify-between pt-4 border-t-2 border-white/10">
          {/* Left Speedometer */}
          <div className="bg-[#030712]/90 border border-cyan-500/30 p-3 rounded-xl flex flex-col gap-1 font-mono text-xs shadow-[0_0_20px_rgba(0,212,255,0.2)]">
            <span className="text-white/40 text-[10px]">CURRENT BUS VELOCITY</span>
            <span className="text-xl font-black text-cyan-400 tabular-nums">{meta.speed}</span>
          </div>

          {/* Center Windshield Wiper Blade */}
          <motion.div
            initial={{ rotate: -35 }}
            animate={{ rotate: 35 }}
            transition={{ duration: 0.7, repeat: 1, repeatType: 'reverse', ease: 'easeInOut' }}
            className="w-3 h-44 bg-gradient-to-t from-[#1e293b] via-[#334155] to-transparent rounded-full origin-bottom shadow-2xl"
          />

          {/* Right Sensor Telemetry */}
          <div className="bg-[#030712]/90 border border-amber-500/30 p-3 rounded-xl flex flex-col items-end gap-1 font-mono text-xs shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <span className="text-white/40 text-[10px]">EDGE NEURAL PROCESSING</span>
            <span className="text-xs font-bold text-amber-400">{meta.sensor}</span>
          </div>
        </div>

        {/* Glass reflection beam */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-cyan-300/[0.08] to-transparent pointer-events-none rounded-[28px]" />
      </motion.div>
    </motion.div>
    )}
    </AnimatePresence>
  );
}

