import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { fetchAlerts, fetchSummary, fetchHeatmap } from '../lib/api';
import { MapView } from '../components/map/MapView';
import { AlertListPanel } from '../components/panels/AlertListPanel';
import { AlertDetailPanel } from '../components/panels/AlertDetailPanel';
import { FloatingMetricCards } from '../components/cards/FloatingMetricCards';
import { CorridorPCIBar } from '../components/common/CorridorPCIBar';
import { BottomDrawer } from '../components/charts/BottomDrawer';
import type { HeatmapPoint } from '../types';

export function DashboardPage() {
  const {
    alerts, setAlerts, setAlertsLoading, isAlertsLoading,
    summary, setSummary, setSummaryLoading, isSummaryLoading,
    selectedAlertId, setSelectedAlertId,
    filterType,
  } = useAppStore();

  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);

  useEffect(() => {
    setAlertsLoading(true);
    fetchAlerts({ type: filterType })
      .then(setAlerts)
      .finally(() => setAlertsLoading(false));

    // Live polling every 4 seconds for edge-AI detections
    const interval = setInterval(() => {
      fetchAlerts({ type: filterType }).then(setAlerts).catch(() => {});
      fetchSummary().then(setSummary).catch(() => {});
    }, 4000);

    return () => clearInterval(interval);
  }, [filterType, setAlerts, setAlertsLoading, setSummary]);

  useEffect(() => {
    setSummaryLoading(true);
    fetchSummary()
      .then(setSummary)
      .finally(() => setSummaryLoading(false));
  }, [setSummary, setSummaryLoading]);

  useEffect(() => {
    fetchHeatmap().then(setHeatmapPoints);
  }, []);

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) ?? null;

  return (
    /* Map fills 100% — everything floats over it */
    <div className="relative flex-1 min-h-0 overflow-hidden">

      {/* ── Full-bleed map ── */}
      <div className="absolute inset-0 h-full w-full">
        <MapView alerts={alerts} heatmapPoints={heatmapPoints} />
      </div>

      {/* ── Top-left: metric cards floating over map ── */}
      <div className="absolute top-3 left-3 z-[900]">
        <FloatingMetricCards summary={summary} isLoading={isSummaryLoading} />
      </div>

      {/* ── Top-center: Corridor PCI Health Bar ── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[910] hidden lg:block">
        <CorridorPCIBar />
      </div>

      {/* ── Right side: collapsible alert panel ── */}
      <div className="absolute top-0 right-0 h-full z-[900] flex">
        <AlertListPanel alerts={alerts} isLoading={isAlertsLoading} />
      </div>

      {/* ── Alert detail: floats over map bottom-center ── */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[950] w-[420px]">
        <AlertDetailPanel
          alert={selectedAlert}
          onClose={() => setSelectedAlertId(null)}
        />
      </div>

      {/* ── Bottom: collapsible analytics drawer ── */}
      <div className="absolute bottom-0 left-0 right-0 z-[900]">
        <BottomDrawer />
      </div>
    </div>
  );
}
