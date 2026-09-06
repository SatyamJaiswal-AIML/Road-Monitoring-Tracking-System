import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import { motion } from 'motion/react';
import {
  MOCK_DENSITY_SERIES, MOCK_DEFECT_DISTRIBUTION,
  MOCK_ROUTE_DELAYS,
} from '../data/mockData';

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(18,22,31,0.96)',
  border: '1px solid rgba(45,212,191,0.25)',
  borderRadius: '8px',
  color: '#e6edf3',
  fontSize: 11,
};

function Card({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      style={{ willChange: 'transform, opacity' }}
      className="glass rounded-2xl p-5 flex flex-col gap-4"
    >
      <span className="text-sm font-semibold text-white/60 uppercase tracking-wider">{title}</span>
      {children}
    </motion.div>
  );
}




export function AnalyticsPage() {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-white/40 mt-1">Fleet-wide intelligence metrics and traffic patterns</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Vehicle density 24h */}
        <Card title="Vehicle Density — 24h Profile" delay={0}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={MOCK_DENSITY_SERIES}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="hour" tick={{ fill: '#475569', fontSize: 10 }} interval={2} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#f59e0b' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Alert distribution donut */}
        <Card title="Alert Type Distribution" delay={0.1}>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={MOCK_DEFECT_DISTRIBUTION} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                  {MOCK_DEFECT_DISTRIBUTION.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 flex-1">
              {MOCK_DEFECT_DISTRIBUTION.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-zinc-400 flex-1">{d.name}</span>
                  <span className="text-xs font-bold font-mono text-zinc-200">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Route delays */}
        <Card title="Route Delays — Scheduled vs Actual" delay={0.2}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MOCK_ROUTE_DELAYS} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="route" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="scheduled" fill="rgba(255,255,255,0.12)" radius={[4, 4, 0, 0]} name="Scheduled" />
              <Bar dataKey="actual" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Actual" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Bandwidth savings */}
        <Card title="Bandwidth: Edge Processing vs Raw Video" delay={0.3}>
          <div className="flex flex-col gap-4">
            <div className="flex items-end gap-4">
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 rounded-t-lg" style={{ height: 160, background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.4)' }} />
                <span className="text-xs text-rose-400 font-bold">~4,000 MB/hr</span>
                <span className="text-[10px] text-zinc-500">Raw Video</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 rounded-t-lg flex items-end justify-center"
                  style={{ height: 160 }}>
                  <div className="w-full rounded-t-lg" style={{ height: 2, background: '#10b981', boxShadow: '0 0 10px rgba(16,185,129,0.6)' }} />
                </div>
                <span className="text-xs text-emerald-400 font-bold">~0.05 MB/hr</span>
                <span className="text-[10px] text-zinc-500">Edge Alerts</span>
              </div>
              <div className="flex-1 glass rounded-xl p-4 ml-4">
                <div className="text-3xl font-bold text-amber-400 text-glow-amber font-mono">99.97%</div>
                <div className="text-xs text-zinc-300 mt-1">Bandwidth reduction</div>
                <div className="text-xs text-zinc-500 mt-2 leading-relaxed">
                  80,000× less data sent to cloud vs streaming raw video from all cameras
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
