import { useState } from 'react';
import type { Alert } from '../../types';
import { getAlertImageData } from '../../lib/alertImages';

interface AlertCameraSnapshotProps {
  alert: Alert;
  compact?: boolean;
  className?: string;
  showBoundingBox?: boolean;
}

export function AlertCameraSnapshot({
  alert,
  compact = false,
  className = '',
  showBoundingBox = true,
}: AlertCameraSnapshotProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showBox, setShowBox] = useState(showBoundingBox);

  const data = getAlertImageData(alert);
  const height = compact ? '125px' : '170px';

  return (
    <div
      className={`relative w-full rounded-lg overflow-hidden border border-white/10 bg-zinc-950 select-none group ${className}`}
      style={{ height }}
    >
      {/* Fallback pattern / background when loading */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black flex items-center justify-center">
        {!imgLoaded && !imgError && (
          <div className="flex flex-col items-center gap-1.5 text-zinc-500 text-[10px]">
            <div className="w-4 h-4 border-2 border-zinc-600 border-t-amber-400 rounded-full animate-spin" />
            <span>Fetching Edge Camera Frame...</span>
          </div>
        )}
        {imgError && (
          <div className="flex flex-col items-center gap-1 text-center px-4">
            <span className="text-xl">📹</span>
            <span className="text-xs font-semibold text-zinc-300">Live Dashcam Capture</span>
            <span className="text-[10px] text-zinc-500 font-mono">
              BUS: {alert.bus_id} • {alert.lat.toFixed(4)}, {alert.long.toFixed(4)}
            </span>
          </div>
        )}
      </div>

      {/* Real Image */}
      {!imgError && (
        <img
          src={data.url}
          alt={data.label}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imgLoaded ? 'opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500' : 'opacity-0'
          }`}
        />
      )}

      {/* Dark Vignette Overlay for Tactical Look */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />

      {/* Tactical HUD Header */}
      <div className="absolute top-1.5 left-2 right-2 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10 text-[9px] font-mono text-zinc-300">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span>CAM-01 FRONT</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">{alert.bus_id}</span>
        </div>
        <div className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10 text-[9px] font-mono text-emerald-400">
          AI REC
        </div>
      </div>

      {/* YOLO AI Bounding Box Overlay */}
      {showBox && !imgError && (
        <div
          className="absolute pointer-events-none transition-all duration-300"
          style={{
            top: data.boxTop,
            left: data.boxLeft,
            width: data.boxWidth,
            height: data.boxHeight,
            border: `1.5px solid ${data.accentColor}`,
            boxShadow: `0 0 10px ${data.accentColor}55, inset 0 0 8px ${data.accentColor}33`,
            borderRadius: '4px',
          }}
        >
          {/* Label on top corner of bounding box */}
          <div
            className="absolute -top-4 left-0 px-1 py-0.2 text-[9px] font-mono font-bold tracking-tight rounded-t"
            style={{
              background: data.accentColor,
              color: '#000000',
            }}
          >
            {data.boxLabel}
          </div>

          {/* Corner tick marks */}
          <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-white" />
          <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-white" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-white" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-white" />
        </div>
      )}

      {/* Bottom Bar: GPS Stamp & Box Toggle */}
      <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[9px] font-mono">
        <span className="text-zinc-300 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
          {alert.lat.toFixed(4)}°N, {alert.long.toFixed(4)}°E
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowBox(!showBox);
          }}
          className="bg-black/70 hover:bg-black text-[8px] text-zinc-300 hover:text-white px-1.5 py-0.5 rounded border border-white/10 transition-colors pointer-events-auto cursor-pointer"
          title="Toggle AI Bounding Box"
        >
          {showBox ? 'Hide AI Box' : 'Show AI Box'}
        </button>
      </div>
    </div>
  );
}
