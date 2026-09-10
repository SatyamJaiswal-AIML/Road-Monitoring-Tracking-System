import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import { motion } from 'motion/react';
import {
  MOCK_DENSITY_SERIES, MOCK_DEFECT_DISTRIBUTION,
  MOCK_ROUTE_DELAYS, MOCK_CORRIDORS_PCI,
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
                  <div className="w-full rounded-t-lg" style={{ height: 2, background: '#4ef2bb', boxShadow: '0 0 10px rgba(78,242,187,0.6)' }} />
                </div>
                <span className="text-xs text-[#4ef2bb] font-bold">~0.05 MB/hr</span>
                <span className="text-[10px] text-zinc-500">Edge Alerts</span>
              </div>
              <div className="flex-1 glass rounded-xl p-4 ml-4">
                <div className="text-3xl font-bold text-[#4ef2bb] text-glow-mint font-mono">99.97%</div>
                <div className="text-xs text-zinc-300 mt-1">Bandwidth reduction</div>
                <div className="text-xs text-zinc-500 mt-2 leading-relaxed">
                  80,000× less data sent to cloud vs streaming raw video from all cameras
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── NEW: Pavement Condition Index (PCI) Corridor Health (ASTM D6433) ── */}
      <div className="mt-8 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🛣️</span>
              <h2 className="text-lg font-bold text-white tracking-wide">Pavement Condition Index (PCI) — Delhi Arterial Corridors</h2>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 font-mono">
                ASTM D6433 / IRC:SP:16
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Objective automated road distress ratings: Calculates deduct values from AI dashcam detections to determine maintenance budgets.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-300">
              City Network PCI: <span className="text-amber-400 font-bold">67.2 / 100</span> (Fair)
            </span>
          </div>
        </div>

        {/* Corridor Table */}
        <div className="glass rounded-2xl overflow-hidden border border-white/[0.08]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-white/[0.04] text-[10px] uppercase tracking-wider text-zinc-400 font-semibold border-b border-white/[0.08]">
                <tr>
                  <th className="px-4 py-3">Corridor Stretch</th>
                  <th className="px-4 py-3">Length</th>
                  <th className="px-4 py-3">Transit Volume</th>
                  <th className="px-4 py-3">Primary Distress</th>
                  <th className="px-4 py-3">PCI Rating</th>
                  <th className="px-4 py-3">PWD Recommended Treatment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {MOCK_CORRIDORS_PCI.map((c) => {
                  const pciColor =
                    c.pci >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                    : c.pci >= 55 ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                    : 'text-rose-400 bg-rose-500/10 border-rose-500/30';

                  const barColor =
                    c.pci >= 80 ? 'bg-emerald-500'
                    : c.pci >= 55 ? 'bg-amber-500'
                    : 'bg-rose-500';

                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-white text-xs">{c.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{c.lastInspected}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-300">{c.lengthKm} km</td>
                      <td className="px-4 py-3 font-mono text-zinc-300">{c.tripsPerDay} trips/day</td>
                      <td className="px-4 py-3 text-zinc-400">
                        <span>{c.primaryDefect}</span>
                        <span className="text-zinc-500 text-[10px] block font-mono">({c.defectCount} detected events)</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono border ${pciColor}`}>
                            {c.pci}
                          </span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${c.pci}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] text-zinc-200 bg-white/5 px-2 py-1 rounded border border-white/5">
                          {c.recommendedAction}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── NEW: Civic Resolution & AI Audit Intelligence (Anti-Fraud System) ── */}
      <div className="mt-8 flex flex-col gap-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🛡️</span>
              <h2 className="text-lg font-bold text-white tracking-wide">Civic Resolution & AI Re-Audit Dashboard</h2>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-[#4ef2bb]/10 text-[#4ef2bb] border border-[#4ef2bb]/30">
                Anti-Fraud Engine
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Automated post-repair verification: Buses automatically re-scan resolved GPS points to catch fake resolutions.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-300">
              Contractor Integrity: <span className="text-[#4ef2bb] font-bold">96.8%</span>
            </span>
          </div>
        </div>

        {/* 4 Stat Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="glass rounded-xl p-4 flex flex-col gap-1 border border-white/[0.08]">
            <span className="text-[10px] uppercase font-semibold text-zinc-400">Total Work Orders Resolved</span>
            <div className="text-2xl font-bold font-mono text-white">342</div>
            <span className="text-[10px] text-zinc-500">Past 30 days across Delhi NCR</span>
          </div>

          <div className="glass rounded-xl p-4 flex flex-col gap-1 border border-[#4ef2bb]/25 bg-[#4ef2bb]/[0.02]">
            <span className="text-[10px] uppercase font-semibold text-[#4ef2bb]">✓ AI Verified Closed</span>
            <div className="text-2xl font-bold font-mono text-[#4ef2bb]">324</div>
            <span className="text-[10px] text-zinc-400">Buses re-scanned & confirmed smooth</span>
          </div>

          <div className="glass rounded-xl p-4 flex flex-col gap-1 border border-amber-500/25 bg-amber-500/[0.02]">
            <span className="text-[10px] uppercase font-semibold text-amber-400">⏳ Pending AI Re-Scan</span>
            <div className="text-2xl font-bold font-mono text-amber-400">18</div>
            <span className="text-[10px] text-zinc-400">Contractor closed, awaiting bus pass</span>
          </div>

          <div className="glass rounded-xl p-4 flex flex-col gap-1 border border-rose-500/30 bg-rose-500/[0.03]">
            <span className="text-[10px] uppercase font-semibold text-rose-400">🚨 Fake Resolution Caught</span>
            <div className="text-2xl font-bold font-mono text-rose-400">11</div>
            <span className="text-[10px] text-rose-400/80 font-mono">Fraud flagged & auto-reopened</span>
          </div>
        </div>

        {/* Solution Explanation Box: How Fake Resolutions are Caught */}
        <div className="glass rounded-2xl p-5 border border-white/[0.08] flex flex-col gap-3.5 bg-gradient-to-r from-black via-zinc-950 to-black">
          <div className="flex items-center gap-2">
            <span className="text-base">💡</span>
            <span className="text-sm font-bold text-white">How Does the AI Catch Fake/Premature Resolutions?</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-1.5">
              <span className="text-[#4ef2bb] font-bold">1. Contractor Marks "Resolved"</span>
              <p className="text-zinc-400 leading-relaxed text-[11px]">
                PWD contractor uploads a repair timestamp. System places the coordinate into an escrow-like <b>"Pending AI Re-Audit"</b> state. Contractor payment is held.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-1.5">
              <span className="text-amber-400 font-bold">2. Next Bus Re-Scans Coordinate</span>
              <p className="text-zinc-400 leading-relaxed text-[11px]">
                Within 24-48 hours, regular public transport buses travel through that exact GPS point. The on-board camera automatically audits the pavement surface.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-1.5">
              <span className="text-rose-400 font-bold">3. Automated Fraud Prevention</span>
              <p className="text-zinc-400 leading-relaxed text-[11px]">
                If the pothole is gone, status converts to <b>"AI Verified Closed"</b>. If the pothole still exists, the system automatically <b>re-opens the ticket</b>, triggers a penalty flag, and escalates to Vigilance.
              </p>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="glass rounded-2xl overflow-hidden border border-white/[0.08]">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Live AI Re-Verification Audit Stream</span>
            <span className="text-[10px] text-zinc-500 font-mono">Real-time Closed-Loop Feedback</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.04] text-zinc-400 text-[10px] uppercase font-semibold text-left">
                  <th className="px-4 py-2.5">Alert ID & Defect</th>
                  <th className="px-4 py-2.5">Location</th>
                  <th className="px-4 py-2.5">Contractor Claim</th>
                  <th className="px-4 py-2.5">AI Fleet Audit Result</th>
                  <th className="px-4 py-2.5">Audit Bus</th>
                  <th className="px-4 py-2.5">Final Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                <tr className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-zinc-200">ALT-002 • Pothole</td>
                  <td className="px-4 py-3 font-mono text-zinc-400">28.6328°N, 77.2195°E</td>
                  <td className="px-4 py-3 text-zinc-300">Resolved by PWD Zone 4</td>
                  <td className="px-4 py-3 text-[#4ef2bb] font-semibold">✓ Pavement Smooth (0% defect)</td>
                  <td className="px-4 py-3 font-mono text-zinc-400">BUS-017</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#4ef2bb]/15 text-[#4ef2bb] border border-[#4ef2bb]/30">
                      AI Verified Closed
                    </span>
                  </td>
                </tr>

                <tr className="hover:bg-white/[0.02] bg-rose-500/[0.02]">
                  <td className="px-4 py-3 font-mono text-rose-400">ALT-010 • Severe Pothole</td>
                  <td className="px-4 py-3 font-mono text-zinc-400">28.6500°N, 77.2550°E</td>
                  <td className="px-4 py-3 text-zinc-300">Claimed "Fixed" 4h ago</td>
                  <td className="px-4 py-3 text-rose-400 font-bold">🚨 Defect Still Present (96% conf)</td>
                  <td className="px-4 py-3 font-mono text-zinc-400">BUS-021</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                      Fraud Caught • Re-Opened
                    </span>
                  </td>
                </tr>

                <tr className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-zinc-200">ALT-005 • Waterlogging</td>
                  <td className="px-4 py-3 font-mono text-zinc-400">28.6450°N, 77.2010°E</td>
                  <td className="px-4 py-3 text-zinc-300">Drainage cleared</td>
                  <td className="px-4 py-3 text-amber-400">⏳ Awaiting scheduled bus pass</td>
                  <td className="px-4 py-3 font-mono text-zinc-500">Route 410 ETA 2h</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      Pending AI Re-Audit
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
