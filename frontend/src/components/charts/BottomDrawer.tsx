import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { MOCK_DENSITY_SERIES, MOCK_DEFECT_DISTRIBUTION, MOCK_ROUTE_DELAYS } from '../../data/mockData';

const TT = {
  backgroundColor: 'rgba(10,15,30,0.97)',
  border: '1px solid rgba(0,212,255,0.2)',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: 11,
};

const MOCK_PCI_FORECAST = [
  { day: 'Day 0', unmaintained: 74, maintained: 74 },
  { day: 'Day 7', unmaintained: 68, maintained: 77 },
  { day: 'Day 14', unmaintained: 59, maintained: 81 },
  { day: 'Day 21', unmaintained: 49, maintained: 84 },
  { day: 'Day 30', unmaintained: 38, maintained: 86 },
];

export function BottomDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {/* Toggle tab */}
      <div className="flex justify-center">
        <motion.button
          onClick={() => setOpen(!open)}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          style={{ willChange: 'transform' }}
          className="glass border border-white/10 rounded-t-xl px-6 py-1.5 text-xs font-medium text-white/50 hover:text-amber-400 hover:border-amber-500/30 transition-colors cursor-pointer flex items-center gap-2 shadow-lg"
        >
          <span className="text-[10px] uppercase tracking-widest font-bold">Transit Analytics & 30-Day PCI Forecast</span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            style={{ willChange: 'transform' }}
          >
            ▲
          </motion.span>
        </motion.button>
      </div>

      {/* Drawer panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 210, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ willChange: 'transform, opacity' }}
            className="glass border-t border-white/10 overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 h-full">

              {/* Vehicle density */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                  Vehicle Density — 24h
                </span>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={MOCK_DENSITY_SERIES}>
                    <XAxis dataKey="hour" tick={{ fill: '#71717a', fontSize: 8 }} interval={4} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={TT} cursor={{ stroke: 'rgba(245,158,11,0.25)' }} />
                    <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Defect distribution */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                  Alert Types
                </span>
                <div className="flex items-center gap-3 flex-1 min-h-0">
                  <ResponsiveContainer width={100} height="100%">
                    <PieChart>
                      <Pie data={MOCK_DEFECT_DISTRIBUTION} cx="50%" cy="50%" innerRadius={22} outerRadius={38} dataKey="value" strokeWidth={0}>
                        {MOCK_DEFECT_DISTRIBUTION.map((d) => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={TT} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1 flex-1">
                    {MOCK_DEFECT_DISTRIBUTION.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-[10px] text-white/45 truncate">{d.name}</span>
                        <span className="text-[10px] text-white/60 ml-auto font-mono">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Route delays */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                  Route Delays (min)
                </span>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MOCK_ROUTE_DELAYS} barSize={10}>
                    <XAxis dataKey="route" tick={{ fill: '#475569', fontSize: 8 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={TT} />
                    <Bar dataKey="scheduled" fill="rgba(255,255,255,0.08)" radius={[2,2,0,0]} />
                    <Bar dataKey="actual" fill="#f59e0b" radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 30-Day PCI Degradation Forecast (NEW) */}
              <div className="flex flex-col gap-1 bg-black/30 p-2 rounded-xl border border-cyan-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">
                    30D Road PCI Forecast (AI)
                  </span>
                  <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 px-1 rounded">
                    +48 PCI Saved
                  </span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={MOCK_PCI_FORECAST}>
                    <XAxis dataKey="day" tick={{ fill: '#71717a', fontSize: 8 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[20, 100]} hide />
                    <Tooltip contentStyle={TT} />
                    <Line type="monotone" name="Unrepaired Decay" dataKey="unmaintained" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 3" dot={{ r: 2 }} />
                    <Line type="monotone" name="Hawk AI Managed" dataKey="maintained" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
