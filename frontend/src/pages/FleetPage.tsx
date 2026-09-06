import { motion } from 'motion/react';
import { MOCK_FLEET } from '../data/mockData';
import { timeAgo, cn } from '../lib/theme';

export function FleetPage() {
  const active = MOCK_FLEET.filter((b) => b.speed_kmh > 0);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Fleet Status</h1>
          <p className="text-sm text-white/40 mt-1">
            <span className="text-green-400 font-bold">{active.length}</span> buses currently active
          </p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-white/40">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            Active
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            Slow (&lt;15 km/h)
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            Stopped
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
        {MOCK_FLEET.map((bus, i) => {
          const statusColor = bus.speed_kmh > 15
            ? 'bg-green-400'
            : bus.speed_kmh > 0
            ? 'bg-amber-400'
            : 'bg-red-400';
          const textColor = bus.speed_kmh > 15
            ? 'text-green-400'
            : bus.speed_kmh > 0
            ? 'text-amber-400'
            : 'text-red-400';

          return (
            <motion.div
              key={bus.bus_id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: i * 0.015 }}
              style={{ willChange: 'transform, opacity' }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="glass rounded-xl p-3 flex flex-col gap-2 cursor-default"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-white/80">{bus.bus_id}</span>
                <div className="flex items-center gap-1.5">
                  <div className={cn('w-1.5 h-1.5 rounded-full', statusColor)} />
                  <span className={cn('text-[10px] font-mono', textColor)}>{bus.speed_kmh} km/h</span>
                </div>
              </div>
              <div className="text-[10px] text-white/40 truncate">{bus.route}</div>
              <div className="text-[10px] text-white/25 font-mono">
                {bus.lat.toFixed(3)}°N {bus.long.toFixed(3)}°E
              </div>
              <div className="text-[10px] text-white/25">{timeAgo(bus.last_seen)}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
