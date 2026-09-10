import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_CORRIDORS_PCI } from '../../data/mockData';
import type { CorridorPCI } from '../../types';

export function CorridorPCIBar() {
  const [selectedCorridor, setSelectedCorridor] = useState<CorridorPCI | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedCorridor(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStatusColor = (status: CorridorPCI['status']) => {
    switch (status) {
      case 'good':
        return {
          bg: 'bg-emerald-500/15',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          dot: 'bg-emerald-400',
        };
      case 'fair':
        return {
          bg: 'bg-amber-500/15',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          dot: 'bg-amber-400',
        };
      case 'poor':
      case 'critical':
        return {
          bg: 'bg-rose-500/15',
          border: 'border-rose-500/30',
          text: 'text-rose-400',
          dot: 'bg-rose-500',
        };
      default:
        return {
          bg: 'bg-zinc-500/15',
          border: 'border-zinc-500/30',
          text: 'text-zinc-400',
          dot: 'bg-zinc-400',
        };
    }
  };

  return (
    <div ref={containerRef} className="relative select-none">
      {/* Floating Bar with smooth spring layout animation */}
      <motion.div
        layout
        transition={{
          type: 'spring',
          stiffness: 450,
          damping: 32,
        }}
        className="glass glass-accent px-3 py-1.5 rounded-2xl flex items-center gap-2.5 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl"
      >
        {/* Compact Clickable Button (Image 2 - Click to expand/collapse) */}
        <button
          type="button"
          onClick={() => {
            const next = !isOpen;
            setIsOpen(next);
            if (!next) setSelectedCorridor(null);
          }}
          className="flex items-center gap-2.5 text-left cursor-pointer hover:opacity-90 transition-opacity"
          title={isOpen ? 'Click to collapse' : 'Click to view corridors'}
        >
          <span className="text-base">🛣️</span>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-wider text-white uppercase flex items-center gap-1">
              Corridor PCI
              <span className="text-[8px] text-zinc-400 font-normal font-mono">(ASTM D6433)</span>
            </span>
            <span className="text-[9px] text-zinc-400 leading-tight">
              Delhi Arterial Network
            </span>
          </div>

          {/* Toggle indicator arrow */}
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-[11px] text-amber-400 font-bold ml-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20"
          >
            {isOpen ? '▴' : '▾'}
          </motion.span>
        </button>

        {/* Expandable Corridor Pills Row (Appears strictly on CLICK) */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, width: 0, scale: 0.95 }}
              animate={{ opacity: 1, width: 'auto', scale: 1 }}
              exit={{ opacity: 0, width: 0, scale: 0.95 }}
              transition={{
                type: 'spring',
                stiffness: 450,
                damping: 32,
              }}
              className="flex items-center gap-2 pl-2.5 border-l border-white/10 overflow-hidden"
            >
              {MOCK_CORRIDORS_PCI.map((corridor) => {
                const style = getStatusColor(corridor.status);
                const isSelected = selectedCorridor?.id === corridor.id;

                return (
                  <motion.button
                    key={corridor.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCorridor(isSelected ? null : corridor);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs transition-all cursor-pointer select-none whitespace-nowrap ${style.bg} ${style.border} ${
                      isSelected ? 'ring-2 ring-amber-400/60 shadow-lg' : ''
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${corridor.status === 'critical' ? 'animate-ping' : ''}`} />
                    <span className="text-[11px] font-medium text-white/90">
                      {corridor.corridor}
                    </span>
                    <span className={`font-mono font-bold text-[11px] ${style.text}`}>
                      {corridor.pci}
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Popover Breakdown Modal (Appears when clicking an option) */}
      <AnimatePresence>
        {selectedCorridor && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 8, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-1/2 -translate-x-1/2 z-[1000] w-[340px] glass rounded-2xl p-4 border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🛣️</span>
                <div>
                  <h4 className="text-xs font-bold text-white">{selectedCorridor.name}</h4>
                  <p className="text-[10px] text-zinc-400 font-mono">Last surveyed: {selectedCorridor.lastInspected}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCorridor(null);
                }}
                className="text-zinc-400 hover:text-white text-xs w-5 h-5 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3 text-[11px]">
              <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                <span className="text-[9px] text-zinc-400 uppercase">Pavement Index (PCI)</span>
                <div className={`text-base font-bold font-mono ${getStatusColor(selectedCorridor.status).text}`}>
                  {selectedCorridor.pci} / 100
                </div>
              </div>
              <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                <span className="text-[9px] text-zinc-400 uppercase">Active Distress Count</span>
                <div className="text-base font-bold font-mono text-white">
                  {selectedCorridor.defectCount} points
                </div>
              </div>
              <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                <span className="text-[9px] text-zinc-400 uppercase">Corridor Length</span>
                <div className="text-xs font-semibold text-zinc-200 mt-0.5">
                  {selectedCorridor.lengthKm} km
                </div>
              </div>
              <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                <span className="text-[9px] text-zinc-400 uppercase">Transit Volume</span>
                <div className="text-xs font-semibold text-zinc-200 mt-0.5">
                  {selectedCorridor.tripsPerDay} bus trips/day
                </div>
              </div>
            </div>

            {/* Recommended PWD Action */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 mb-2">
              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block mb-0.5">
                PWD Recommended Maintenance Action
              </span>
              <p className="text-[11px] text-zinc-200 leading-tight">
                {selectedCorridor.recommendedAction}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
