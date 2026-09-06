import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { motion } from 'motion/react';
import { MOCK_DENSITY_SERIES, MOCK_DEFECT_DISTRIBUTION, MOCK_ROUTE_DELAYS } from '../../data/mockData';

const CHART_STYLE = {
  background: 'transparent',
  fontFamily: 'Inter, sans-serif',
  fontSize: 10,
};

function ChartCard({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      style={{ willChange: 'transform, opacity' }}
      className="glass rounded-xl p-3 flex flex-col gap-2 min-w-0"
    >
      <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">{title}</span>
      {children}
    </motion.div>
  );
}

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(10,15,30,0.95)',
  border: '1px solid rgba(0,212,255,0.2)',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: 11,
};

export function BottomCharts() {
  return (
    <div className="grid grid-cols-3 gap-3 p-4 border-t border-white/5 shrink-0 h-52">
      {/* Vehicle density line chart */}
      <ChartCard title="Vehicle Density (24h)" delay={0}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={MOCK_DENSITY_SERIES} style={CHART_STYLE}>
            <XAxis
              dataKey="hour"
              tick={{ fill: '#475569', fontSize: 9 }}
              interval={3}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: 'rgba(0,212,255,0.2)' }} />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#00d4ff"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: '#00d4ff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Defect type donut */}
      <ChartCard title="Alert Distribution" delay={0.08}>
        <div className="flex items-center gap-3 flex-1 min-h-0">
          <ResponsiveContainer width={90} height="100%">
            <PieChart>
              <Pie
                data={MOCK_DEFECT_DISTRIBUTION}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={40}
                dataKey="value"
                strokeWidth={0}
              >
                {MOCK_DEFECT_DISTRIBUTION.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            {MOCK_DEFECT_DISTRIBUTION.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 min-w-0">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-[10px] text-white/50 truncate">{d.name}</span>
                <span className="text-[10px] text-white/70 ml-auto font-mono">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>

      {/* Route delays bar chart */}
      <ChartCard title="Route Delays (min)" delay={0.16}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={MOCK_ROUTE_DELAYS} style={CHART_STYLE} barSize={12}>
            <XAxis
              dataKey="route"
              tick={{ fill: '#475569', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="scheduled" fill="rgba(255,255,255,0.08)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="actual" fill="#f59e0b" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
