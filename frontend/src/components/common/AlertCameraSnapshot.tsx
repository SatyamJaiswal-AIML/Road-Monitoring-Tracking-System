import { useState } from 'react';
import type { Alert } from '../../types';
import { ALERT_VISUALS } from '../../lib/theme';

interface AlertCameraSnapshotProps {
  alert: Alert;
  compact?: boolean;
  className?: string;
}

// Alert type icons for the placeholder view
const ALERT_ICONS: Record<string, string> = {
  pothole: '🕳️',
  waterlogging: '🌊',
  missing_signboard: '⚠️',
  missing_crossing: '🚶',
  vehicle_density: '🚗',
  bottleneck: '🔻',
  pedestrian_risk: '🚶‍♂️',
  incident_hit_and_run: '💥',
};

export function AlertCameraSnapshot({
  alert,
  compact = false,
  className = '',
}: AlertCameraSnapshotProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const realImageUrl = alert.meta?.image_url || alert.image_url;
  const hasRealCapture = Boolean(realImageUrl) && !imgError;
  const vis = ALERT_VISUALS[alert.type];
  const accentColor = vis?.color || '#f59e0b';
  const height = compact ? '125px' : '170px';

  // ── REAL CAPTURE MODE ──
  // When process_real_video.py has run and produced a real YOLO-annotated frame
  if (realImageUrl && !imgError) {
    return (
      <div
        className={`relative w-full rounded-lg overflow-hidden border border-white/10 bg-zinc-950 select-none group ${className}`}
        style={{ height }}
      >
        {/* Loading spinner */}
        {!imgLoaded && (
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black flex items-center justify-center">
            <div className="flex flex-col items-center gap-1.5 text-zinc-500 text-[10px]">
              <div className="w-4 h-4 border-2 border-zinc-600 border-t-amber-400 rounded-full animate-spin" />
              <span>Loading Edge Capture...</span>
            </div>
          </div>
        )}

        {/* Real YOLO-processed image */}
        <img
          src={realImageUrl}
          alt={`AI Detection: ${alert.type}`}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imgLoaded ? 'opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500' : 'opacity-0'
          }`}
        />

        {/* Dark Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />

        {/* HUD Header */}
        <div className="absolute top-1.5 left-2 right-2 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10 text-[9px] font-mono text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span>CAM-01 FRONT</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">{alert.bus_id}</span>
          </div>
          <div className="px-1.5 py-0.5 rounded bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30 text-[9px] font-mono text-emerald-400 font-bold">
            ✓ REAL CAPTURE
          </div>
        </div>

        {/* Bottom GPS */}
        <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[9px] font-mono">
          <span className="text-zinc-300 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
            {alert.lat.toFixed(4)}°N, {alert.long.toFixed(4)}°E
          </span>
          <span className="text-emerald-400 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm text-[8px]">
            YOLO v8 PROCESSED
          </span>
        </div>
      </div>
    );
  }

  // ── PLACEHOLDER MODE ──
  // No real edge capture yet — show professional "awaiting capture" view
  // This is NOT a fake photo — it's an honest indicator that the edge processor hasn't run
  return (
    <div
      className={`relative w-full rounded-lg overflow-hidden border border-white/10 bg-zinc-950 select-none ${className}`}
      style={{ height }}
    >
      {/* Dark gradient background with subtle grid pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black">
        {/* Subtle scan lines effect */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 3px)',
          }}
        />
        {/* Subtle scanning animation */}
        <div
          className="absolute inset-x-0 h-px opacity-20 animate-pulse"
          style={{
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
            top: '50%',
            animation: 'scan 3s ease-in-out infinite',
          }}
        />
      </div>

      {/* Center Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-4">
        {/* Alert type icon */}
        <span className="text-2xl opacity-40">{ALERT_ICONS[alert.type] || '📷'}</span>

        {/* Main label */}
        <span className="text-[11px] font-semibold text-zinc-400 tracking-wide uppercase">
          Awaiting Edge Capture
        </span>

        {/* Explanation */}
        {!compact && (
          <span className="text-[9px] text-zinc-600 text-center leading-tight max-w-[180px]">
            Run edge processor on dashcam video to generate AI-annotated captures
          </span>
        )}

        {/* Bus + GPS info */}
        <span className="text-[9px] text-zinc-600 font-mono mt-0.5">
          {alert.bus_id} • {alert.lat.toFixed(4)}°N, {alert.long.toFixed(4)}°E
        </span>
      </div>

      {/* HUD Header - still shows to maintain tactical look */}
      <div className="absolute top-1.5 left-2 right-2 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10 text-[9px] font-mono text-zinc-500">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
          <span>CAM-01 FRONT</span>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-600">{alert.bus_id}</span>
        </div>
        <div className="px-1.5 py-0.5 rounded bg-zinc-800/60 backdrop-blur-sm border border-zinc-700/30 text-[9px] font-mono text-zinc-500">
          STANDBY
        </div>
      </div>

      {/* Bottom status */}
      <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-center">
        <span className="text-[8px] font-mono text-zinc-600 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm border border-white/5">
          Edge AI capture will appear here automatically
        </span>
      </div>

      {/* Inject keyframe animation */}
      <style>{`
        @keyframes scan {
          0%, 100% { top: 20%; opacity: 0.1; }
          50% { top: 80%; opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
