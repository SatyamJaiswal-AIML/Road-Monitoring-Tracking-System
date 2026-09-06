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
          className="glass border border-white/10 rounded-t-xl px-6 py-1.5 text-xs font-medium text-white/50 hover:text-amber-400 hover:border-amber-500/30 transition-colors cursor-pointer flex items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-widest">Analytics</span>
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
            animate={{ height: 200, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ willChange: 'transform, opacity' }}
            className="glass border-t border-white/10 overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-3 p-3 h-full">

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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
