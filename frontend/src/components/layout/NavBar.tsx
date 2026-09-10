import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import type { DashboardPage } from '../../types';
import { ALERT_VISUALS, timeAgo, cn } from '../../lib/theme';

const NAV_ITEMS: { page: DashboardPage; label: string; icon: string }[] = [
  { page: 'dashboard', label: 'Dashboard',    icon: '🗺' },
  { page: 'incidents', label: 'Incidents',    icon: '🚨' },
  { page: 'analytics', label: 'Analytics',   icon: '📊' },
  { page: 'fleet',     label: 'Fleet',       icon: '🚌' },
  { page: 'video',     label: 'AI Video Analysis', icon: '🎥' },
];

// ─── Sidebar (Motion.dev Pitch Black & Mint Pill) ───────────────────────────
export function Sidebar() {
  const { currentPage, setCurrentPage } = useAppStore();

  return (
    <aside className="flex flex-col items-center gap-2 w-[62px] shrink-0 z-20 py-4 bg-[#080808] border-r border-white/[0.1]">
      {/* Logo */}
      <div className="mb-4 flex flex-col items-center">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black text-black bg-[#4ef2bb] shadow-[0_0_20px_rgba(78,242,187,0.4)]">
          🦅
        </div>
      </div>

      {NAV_ITEMS.map(({ page, label, icon }) => {
        const active = currentPage === page;
        return (
          <motion.button
            key={page}
            onClick={() => setCurrentPage(page)}
            title={label}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            className={cn(
              'relative w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all duration-200',
              active
                ? 'bg-white/[0.1] text-[#4ef2bb]'
                : 'text-zinc-500 hover:text-white hover:bg-white/[0.04]'
            )}
            style={{
              willChange: 'transform',
              border: active ? '1px solid rgba(78,242,187,0.4)' : '1px solid transparent',
              boxShadow: active ? '0 4px 20px rgba(0,0,0,0.8)' : 'none',
            }}
          >
            <span className="text-base leading-none">{icon}</span>
            {/* Active indicator bar */}
            {active && (
              <motion.div
                layoutId="nav-bar"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#4ef2bb] shadow-[0_0_10px_#4ef2bb]"
                style={{ willChange: 'transform' }}
              />
            )}
          </motion.button>
        );
      })}
    </aside>
  );
}

// ─── Live Clock ─────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-xs text-zinc-400 tabular-nums tracking-wider">{time}</span>;
}

// ─── NavBar with Interactive Notification Dropdown ───────────────────────────
interface NavBarProps {
  busCount: number;
}

export function NavBar({ busCount }: NavBarProps) {
  const { alerts, setSelectedAlertId, flyTo, setCurrentPage } = useAppStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter urgent / open alerts as notifications
  const notifications = alerts.filter((a) => a.status === 'open').slice(0, 6);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const handleNotificationClick = (alert: (typeof alerts)[0]) => {
    setSelectedAlertId(alert.id);
    flyTo(alert.lat, alert.long);
    setCurrentPage('dashboard');
    setShowNotifications(false);
  };

  return (
    <header className="h-14 shrink-0 flex items-center px-6 gap-4 z-[1200] bg-[#080808] border-b border-white/[0.1] relative">
      {/* Brand */}
      <div className="flex items-center gap-2 mr-auto">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#4ef2bb] text-black font-black text-sm tracking-wide shadow-[0_0_15px_rgba(78,242,187,0.3)]">
          <span className="text-base leading-none">🦅</span>
          <span>HAWK</span>
          <span className="text-xs bg-black text-[#4ef2bb] px-1.5 py-0.5 rounded font-mono font-bold">AI</span>
        </div>
        <span className="ml-3 text-[10px] text-zinc-400 font-mono uppercase tracking-[0.2em] px-2.5 py-1 rounded bg-[#141416] border border-white/[0.08]">
          BEL · SIH 2026
        </span>
      </div>

      {/* Fleet live radar badge */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#4ef2bb]/[0.08] border border-[#4ef2bb]/30 shadow-[0_0_15px_rgba(78,242,187,0.15)] cursor-default"
      >
        <div className="relative w-2 h-2 flex items-center justify-center">
          <span className="absolute w-2 h-2 rounded-full bg-[#4ef2bb]" />
          <span className="absolute w-4 h-4 rounded-full border border-[#4ef2bb]/60 animate-ping" />
        </div>
        <span className="text-xs font-medium">
          <span className="text-[#4ef2bb] font-bold font-mono tracking-tight">{busCount}</span>
          <span className="text-zinc-400 ml-1.5 font-mono">UNITS LIVE</span>
        </span>
      </motion.div>

      <LiveClock />

      {/* ── Notification Bell Container ── */}
      <div className="relative" ref={dropdownRef}>
        <motion.button
          onClick={() => setShowNotifications(!showNotifications)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          className={cn(
            'relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer border',
            showNotifications
              ? 'bg-[#4ef2bb]/20 border-[#4ef2bb] text-[#4ef2bb]'
              : 'bg-[#141416] border-white/[0.1] text-zinc-400 hover:text-white hover:border-white/20'
          )}
          title="Incident Notifications"
        >
          🔔
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.6)]">
              {notifications.length}
            </span>
          )}
        </motion.button>

        {/* ── Notification Dropdown Modal ── */}
        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-[#0e0e11]/95 border border-white/[0.15] shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden z-[9999] backdrop-blur-2xl"
            >
              {/* Dropdown Header */}
              <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-white">Live Dispatches</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-mono text-[10px] font-bold">
                    {notifications.length} Unresolved
                  </span>
                </div>
                <button
                  onClick={() => {
                    setCurrentPage('incidents');
                    setShowNotifications(false);
                  }}
                  className="text-[11px] text-[#4ef2bb] hover:underline font-mono font-medium cursor-pointer"
                >
                  View all →
                </button>
              </div>

              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.04]">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500">
                    No open alerts at this moment
                  </div>
                ) : (
                  notifications.map((alert) => {
                    const vis = ALERT_VISUALS[alert.type];
                    return (
                      <div
                        key={alert.id}
                        onClick={() => handleNotificationClick(alert)}
                        className="p-3 hover:bg-white/[0.04] transition-colors cursor-pointer flex items-start gap-3 group"
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 border mt-0.5"
                          style={{ background: `${vis.color}15`, borderColor: `${vis.color}40` }}
                        >
                          {vis.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-white group-hover:text-[#4ef2bb] transition-colors truncate">
                              {vis.label}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                              {timeAgo(alert.timestamp)}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate">
                            Bus {alert.bus_id} · {alert.meta.plate_number ? `ANPR: ${alert.meta.plate_number}` : `${(alert.confidence * 100).toFixed(0)}% confidence`}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom footer button */}
              <div className="p-2 border-t border-white/[0.06] bg-black/20">
                <button
                  onClick={() => {
                    setCurrentPage('incidents');
                    setShowNotifications(false);
                  }}
                  className="w-full py-2 rounded-xl text-xs font-bold text-center bg-white/[0.05] hover:bg-[#4ef2bb] hover:text-black transition-all cursor-pointer text-zinc-300"
                >
                  Go to Incident Command Center
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
