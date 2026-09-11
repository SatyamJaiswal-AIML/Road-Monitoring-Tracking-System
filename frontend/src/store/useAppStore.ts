import { create } from 'zustand';
import type {
  Alert, AlertStatus, AnalyticsSummary,
  FilterType, MapView, DashboardPage, ReplayState, PlaybackSpeed,
  VideoAnalysisResult,
} from '../types';

// ─── App store ────────────────────────────────────────────────────────────────

interface AppStore {
  // ── Page ──────────────────────────────────────────────────────────────
  currentPage: DashboardPage;
  setCurrentPage: (page: DashboardPage) => void;

  // ── Alerts ────────────────────────────────────────────────────────────
  alerts: Alert[];
  setAlerts: (alerts: Alert[]) => void;
  updateAlertStatus: (id: string, status: AlertStatus) => void;

  // ── Selected alert (for detail panel) ────────────────────────────────
  selectedAlertId: string | null;
  setSelectedAlertId: (id: string | null) => void;

  // ── Summary ───────────────────────────────────────────────────────────
  summary: AnalyticsSummary | null;
  setSummary: (s: AnalyticsSummary) => void;

  // ── Map ───────────────────────────────────────────────────────────────
  mapView: MapView;
  setMapView: (v: MapView) => void;
  mapFlyTarget: { lat: number; lng: number } | null;
  flyTo: (lat: number, lng: number) => void;
  clearFlyTarget: () => void;

  // ── Filters ───────────────────────────────────────────────────────────
  filterType: FilterType;
  setFilterType: (t: FilterType) => void;

  // ── Loading states ────────────────────────────────────────────────────
  isAlertsLoading: boolean;
  setAlertsLoading: (b: boolean) => void;
  isSummaryLoading: boolean;
  setSummaryLoading: (b: boolean) => void;

  // ── Route replay ──────────────────────────────────────────────────────
  replay: ReplayState;
  setReplayBus: (busId: string, duration: number) => void;
  setReplayPlaying: (b: boolean) => void;
  setReplayTime: (t: number) => void;
  setReplaySpeed: (s: PlaybackSpeed) => void;
  resetReplay: () => void;

  // ── Live Dashcam (NEW) ────────────────────────────────────────────────
  isDashcamOpen: boolean;
  setDashcamOpen: (b: boolean) => void;

  // ── Video Analysis (NEW) ──────────────────────────────────────────────
  videoResult: VideoAnalysisResult | null;
  setVideoResult: (r: VideoAnalysisResult | null) => void;
  isVideoAnalyzing: boolean;
  setVideoAnalyzing: (b: boolean) => void;
  /** Merge video-detected alerts into the main alerts list */
  mergeVideoAlerts: (alerts: Alert[]) => void;
}

const DEFAULT_REPLAY: ReplayState = {
  isPlaying: false,
  currentTime: 0,
  totalDuration: 0,
  speed: 1,
  busId: null,
};

export const useAppStore = create<AppStore>((set) => ({
  // ── Page ──────────────────────────────────────────────────────────────
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),

  // ── Alerts ────────────────────────────────────────────────────────────
  alerts: [],
  setAlerts: (newAlerts) =>
    set((s) => {
      const existingMap = new Map(s.alerts.map((a) => [a.id, a]));
      const merged = newAlerts.map((incoming) => {
        const existing = existingMap.get(incoming.id);
        if (existing) {
          const existingImg = existing.meta?.image_url || existing.image_url;
          const incomingImg = incoming.meta?.image_url || incoming.image_url;
          if (!incomingImg && existingImg) {
            return {
              ...incoming,
              meta: { ...incoming.meta, image_url: existingImg },
            };
          }
        }
        return incoming;
      });
      return { alerts: merged };
    }),
  updateAlertStatus: (id, status) =>
    set((s) => ({
      alerts: s.alerts.map((a) => (a.id === id ? { ...a, status } : a)),
    })),

  // ── Selected alert ────────────────────────────────────────────────────
  selectedAlertId: null,
  setSelectedAlertId: (id) => set({ selectedAlertId: id }),

  // ── Summary ───────────────────────────────────────────────────────────
  summary: null,
  setSummary: (summary) => set({ summary }),

  // ── Map ───────────────────────────────────────────────────────────────
  mapView: 'markers',
  setMapView: (mapView) => set({ mapView }),
  mapFlyTarget: null,
  flyTo: (lat, lng) => set({ mapFlyTarget: { lat, lng } }),
  clearFlyTarget: () => set({ mapFlyTarget: null }),

  // ── Filters ───────────────────────────────────────────────────────────
  filterType: 'all',
  setFilterType: (filterType) => set({ filterType }),

  // ── Loading ───────────────────────────────────────────────────────────
  isAlertsLoading: true,
  setAlertsLoading: (b) => set({ isAlertsLoading: b }),
  isSummaryLoading: true,
  setSummaryLoading: (b) => set({ isSummaryLoading: b }),

  // ── Replay ────────────────────────────────────────────────────────────
  replay: DEFAULT_REPLAY,
  setReplayBus: (busId, duration) =>
    set({ replay: { ...DEFAULT_REPLAY, busId, totalDuration: duration } }),
  setReplayPlaying: (b) =>
    set((s) => ({ replay: { ...s.replay, isPlaying: b } })),
  setReplayTime: (t) =>
    set((s) => ({ replay: { ...s.replay, currentTime: t } })),
  setReplaySpeed: (speed) =>
    set((s) => ({ replay: { ...s.replay, speed } })),
  resetReplay: () => set({ replay: DEFAULT_REPLAY }),

  // ── Live Dashcam ──────────────────────────────────────────────────────
  isDashcamOpen: false,
  setDashcamOpen: (open) => set({ isDashcamOpen: open }),

  // ── Video Analysis ────────────────────────────────────────────────────
  videoResult: null,
  setVideoResult: (r) => set({ videoResult: r }),
  isVideoAnalyzing: false,
  setVideoAnalyzing: (b) => set({ isVideoAnalyzing: b }),
  mergeVideoAlerts: (newAlerts) =>
    set((s) => {
      const existingIds = new Set(s.alerts.map((a) => a.id));
      const fresh = newAlerts.filter((a) => !existingIds.has(a.id));
      return { alerts: [...fresh, ...s.alerts] };
    }),
}));
