import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../../store/useAppStore';
import { ALERT_VISUALS, timeAgo, cn } from '../../lib/theme';
import type { Alert, HeatmapPoint, MapView as MapViewType } from '../../types';

import { AlertCameraSnapshot } from '../common/AlertCameraSnapshot';

// ─── Fix leaflet default icon broken by bundlers ──────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Create custom SVG div icon ───────────────────────────────────────────────

function makeIcon(alert: Alert): L.DivIcon {
  const vis = ALERT_VISUALS[alert.type];
  const beamH = Math.round(vis.severity * 6 + alert.confidence * 14);
  const pulseRing = (vis.severity === 3 || alert.status === 'open')
    ? `<div style="
        position:absolute;bottom:0;left:50%;transform:translateX(-50%);
        width:28px;height:28px;border-radius:50%;
        border:2px solid ${vis.color};
        animation:leafletPulse 1.8s ease-out infinite;
        pointer-events:none;
      "></div>` : '';

  const html = `
    <div style="position:relative;width:32px;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
      <div style="width:3px;height:${beamH}px;background:linear-gradient(to top,${vis.color}CC,${vis.color}00);border-radius:2px;margin-bottom:2px;filter:blur(1px);"></div>
      <div style="width:28px;height:28px;border-radius:50%;background:${vis.color}22;border:2px solid ${vis.color};display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 0 12px ${vis.color}80,0 0 24px ${vis.color}40;animation:markerPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both;">
        ${vis.icon}
      </div>
      ${pulseRing}
    </div>`;

  return L.divIcon({ html, className: '', iconSize: [32, 28 + beamH], iconAnchor: [16, 28 + beamH] });
}

// Inject keyframes once
const styleEl = document.createElement('style');
styleEl.textContent = `
  @keyframes markerPop { from{transform:scale(0);opacity:0} to{transform:scale(1);opacity:1} }
  @keyframes leafletPulse { 0%{transform:translateX(-50%) scale(1);opacity:.8} 100%{transform:translateX(-50%) scale(2.2);opacity:0} }
  @media(prefers-reduced-motion:reduce){[style*="markerPop"],[style*="leafletPulse"]{animation:none!important}}
  .leaflet-container { background: #0a0f1e !important; }
  .leaflet-popup-content-wrapper {
    background: rgba(10,15,30,0.96) !important;
    border: 1px solid rgba(255,255,255,0.15) !important;
    border-radius: 12px !important;
    box-shadow: 0 12px 40px rgba(0,0,0,.7), 0 0 20px rgba(0,212,255,.12) !important;
    color: #e2e8f0 !important;
    padding: 0 !important;
    overflow: hidden !important;
  }
  .leaflet-popup-tip { display:none !important; }
  .leaflet-popup-content { margin: 0 !important; width: 260px !important; }
  .leaflet-control-zoom a {
    background: rgba(10,15,30,0.9) !important;
    border-color: rgba(255,255,255,0.1) !important;
    color: rgba(255,255,255,0.6) !important;
  }
  .leaflet-control-zoom a:hover { background: rgba(0,212,255,0.15) !important; color: #00d4ff !important; }
  .leaflet-control-attribution { display:none !important; }
`;
document.head.appendChild(styleEl);

// ─── Heatmap layer (leaflet.heat via dynamic import) ──────────────────────────

function HeatmapLayer({ points, visible }: { points: HeatmapPoint[]; visible: boolean }) {
  const map = useMap();
  const heatRef = useRef<any>(null);

  useEffect(() => {
    let layer: any = null;

    async function init() {
      // dynamic import so it doesn't break SSR / tree-shake
      await import('leaflet.heat');
      if (!visible) return;
      const latlngs = points.map(p => [p.lat, p.long, p.weight] as [number, number, number]);
      layer = (L as any).heatLayer(latlngs, {
        radius: 30,
        blur: 20,
        maxZoom: 17,
        gradient: { 0.2: '#00d4ff', 0.4: '#f59e0b', 0.65: '#f97316', 1: '#ef4444' },
      }).addTo(map);
      heatRef.current = layer;
    }

    if (visible) init();
    return () => { if (heatRef.current) { heatRef.current.remove(); heatRef.current = null; } };
  }, [visible, points, map]);

  return null;
}

// ─── FlyTo controller ─────────────────────────────────────────────────────────

function FlyToController() {
  const { mapFlyTarget, clearFlyTarget } = useAppStore();
  const map = useMap();

  useEffect(() => {
    if (!mapFlyTarget) return;
    map.flyTo([mapFlyTarget.lat, mapFlyTarget.lng], 15, { duration: 1.2 });
    clearFlyTarget();
  }, [mapFlyTarget, map, clearFlyTarget]);

  return null;
}

// ─── View toggle ──────────────────────────────────────────────────────────────

function ViewToggle({ mapView, setMapView }: { mapView: MapViewType; setMapView: (v: MapViewType) => void }) {
  return (
    <div className="glass rounded-xl p-1 flex gap-1">
      {(['markers', 'heatmap'] as MapViewType[]).map((v) => (
        <motion.button
          key={v}
          onClick={() => setMapView(v)}
          whileTap={{ scale: 0.95 }}
          style={{ willChange: 'transform' }}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer',
            mapView === v
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/35'
              : 'text-zinc-400 hover:text-zinc-200'
          )}
        >
          {v === 'markers' ? '📍 Markers' : '🌡️ Heatmap'}
        </motion.button>
      ))}
    </div>
  );
}

// ─── Popup content ────────────────────────────────────────────────────────────

function AlertPopup({ alert }: { alert: Alert }) {
  const vis = ALERT_VISUALS[alert.type];
  const conf = Math.round(alert.confidence * 100);
  const confColor = conf >= 90 ? '#22c55e' : conf >= 75 ? '#f59e0b' : '#ef4444';
  const { setSelectedAlertId } = useAppStore();

  return (
    <div style={{ padding: '12px 14px', width: 260, fontFamily: 'Inter,sans-serif' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 16 }}>{vis.icon}</span>
          <span style={{ color: vis.color, fontWeight: 700, fontSize: 13 }}>{vis.label}</span>
        </div>
        <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>{alert.id}</span>
      </div>

      {/* Edge Camera Photo Snapshot */}
      <div style={{ marginBottom: 8 }}>
        <AlertCameraSnapshot alert={alert} compact />
      </div>

      {/* Telemetry info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
        <Row label="AI Confidence" value={`${conf}%`} valueColor={confColor} />
        <Row label="Bus Unit" value={alert.bus_id} mono />
        <Row label="Time" value={timeAgo(alert.timestamp)} />
        {alert.meta.plate_number && <Row label="Plate (ANPR)" value={alert.meta.plate_number} valueColor="#f59e0b" mono />}
        {alert.meta.vehicle_count && <Row label="Vehicles" value={String(alert.meta.vehicle_count)} />}
        {alert.meta.verified_by_bus_count && (
          <Row
            label="Fleet Consensus"
            value={`Verified by ${alert.meta.verified_by_bus_count} buses`}
            valueColor="#38bdf8"
          />
        )}
        <div style={{ marginTop: 3, fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>
          {alert.lat.toFixed(4)}°N {alert.long.toFixed(4)}°E
        </div>
      </div>

      {/* Action Button */}
      <button
        type="button"
        onClick={() => setSelectedAlertId(alert.id)}
        style={{
          width: '100%',
          padding: '7px 0',
          borderRadius: 8,
          background: `${vis.color}22`,
          border: `1px solid ${vis.color}55`,
          color: vis.color,
          fontSize: 11,
          fontWeight: 700,
          cursor: 'pointer',
          textAlign: 'center',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = `${vis.color}3a`)}
        onMouseLeave={(e) => (e.currentTarget.style.background = `${vis.color}22`)}
      >
        Inspect & Take Action →
      </button>
    </div>
  );
}

function Row({ label, value, valueColor, mono }: { label: string; value: string; valueColor?: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
      <span>{label}</span>
      <span style={{ color: valueColor ?? '#e2e8f0', fontFamily: mono ? 'monospace' : undefined, fontWeight: valueColor ? 700 : undefined }}>
        {value}
      </span>
    </div>
  );
}

// ─── Main map component ───────────────────────────────────────────────────────

interface MapViewProps {
  alerts: Alert[];
  heatmapPoints: HeatmapPoint[];
}

export function MapView({ alerts, heatmapPoints }: MapViewProps) {
  const { mapView, setMapView } = useAppStore();

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[28.6139, 77.2090]}
        zoom={13}
        minZoom={3}
        maxZoom={19}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        {/* OpenStreetMap tiles — free, no API key, full place labels */}
        {/* CSS invert+hue-rotate gives a clean dark look */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution=""
          className="osm-dark-tiles"
        />

        <FlyToController />

        {/* Heatmap */}
        <HeatmapLayer points={heatmapPoints} visible={mapView === 'heatmap'} />

        {/* Alert markers */}
        <AnimatePresence>
          {mapView === 'markers' && alerts.map((alert) => (
            <Marker
              key={alert.id}
              position={[alert.lat, alert.long]}
              icon={makeIcon(alert)}
            >
              <Popup closeButton={false} offset={[0, -10]}>
                <AlertPopup alert={alert} />
              </Popup>
            </Marker>
          ))}
        </AnimatePresence>
      </MapContainer>

      {/* Floating toolbar (top-center, avoids right-side drawer) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[800] flex items-center gap-2">
        <ViewToggle mapView={mapView} setMapView={setMapView} />
      </div>

      {/* Legend (bottom-left, above bottom drawer) */}
      <AnimatePresence>
        {mapView === 'markers' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
            style={{ willChange: 'transform, opacity' }}
            className="absolute bottom-10 left-3 z-[800] glass rounded-xl p-2.5 flex flex-col gap-1.5"
          >
            {Object.entries(ALERT_VISUALS).slice(0, 5).map(([type, vis]) => (
              <div key={type} className="flex items-center gap-2 text-[11px]">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: vis.color, boxShadow: `0 0 6px ${vis.color}` }}
                />
                <span className="text-white/60 text-[10px] font-medium">{vis.label}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
