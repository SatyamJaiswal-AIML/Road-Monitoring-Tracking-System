import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppStore } from '../store/useAppStore';
import {
  analyzeVideoFile,
  downloadWorkOrderPdf,
  deleteVideoPothole,
  deleteVideoPotholesBatch,
  saveVideoAlerts,
  clearAllVideoAlerts,
} from '../lib/api';
import {
  SEVERITY_VISUALS,
  cn, formatGPS, confidencePct,
} from '../lib/theme';
import type {
  PotholeDetection,
  Alert, SeverityLevel, VideoAnalysisResult,
} from '../types';

// ─── Fix Leaflet default icon (bundler issue) ─────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Severity-coded custom Leaflet icon ───────────────────────────────────────
function makeSeverityIcon(level: SeverityLevel): L.DivIcon {
  const sv = SEVERITY_VISUALS[level];
  const emoji = ['🟢', '🟡', '🔴'][level - 1];
  const pulseAnim = level === 3
    ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        width:36px;height:36px;border-radius:50%;border:2px solid ${sv.color};
        animation:vidPulse 1.6s ease-out infinite;pointer-events:none;"></div>`
    : '';
  const html = `
    <div style="position:relative;width:32px;height:32px;display:flex;align-items:center;
      justify-content:center;border-radius:50%;background:${sv.color}22;
      border:2px solid ${sv.color};font-size:14px;
      box-shadow:0 0 14px ${sv.color}66,0 0 28px ${sv.color}33;
      animation:vidPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both;">
      ${emoji}
      ${pulseAnim}
    </div>`;
  return L.divIcon({ html, className: '', iconSize: [32, 32], iconAnchor: [16, 16] });
}

// ─── Map auto-fit helper ──────────────────────────────────────────────────────
function MapFit({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) { map.setView(points[0], 15); return; }
    map.fitBounds(L.latLngBounds(points), { padding: [32, 32] });
  }, [points, map]);
  return null;
}

// ─── Severity Badge ───────────────────────────────────────────────────────────
function SeverityBadge({ level }: { level: SeverityLevel }) {
  const sv = SEVERITY_VISUALS[level];
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
      sv.textClass, sv.bgClass, sv.borderClass,
    )}>
      {sv.badgeEmoji} Level {level} — {sv.label}
    </span>
  );
}

// ─── Unique Image Resolver & Dynamic SVG Fallback ─────────────────────────────
function getPotholeImageUrl(ph: PotholeDetection): string {
  if (ph.image_url && ph.image_url.trim() !== '' && !ph.image_url.endsWith('/pothole.jpg')) {
    return ph.image_url;
  }
  return `/images/alerts/pothole_${ph.detection_id}.jpg`;
}

function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>, ph: PotholeDetection) {
  const target = e.target as HTMLImageElement;
  const color = ph.severity_level === 3 ? '#ef4444' : ph.severity_level === 2 ? '#f59e0b' : '#22c55e';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180" fill="#070b14">
    <rect width="100%" height="100%" fill="#0a0f1e"/>
    <rect x="15" y="15" width="290" height="150" rx="8" stroke="${color}" stroke-dasharray="6,4" fill="${color}12"/>
    <circle cx="160" cy="75" r="28" fill="${color}25" stroke="${color}" stroke-width="2"/>
    <text x="160" y="82" fill="#ffffff" font-family="monospace" font-size="20" text-anchor="middle">🕳️</text>
    <text x="160" y="122" fill="#ffffff" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">DEFECT #${ph.detection_id}</text>
    <text x="160" y="140" fill="${color}" font-family="monospace" font-size="10" text-anchor="middle">LEVEL ${ph.severity_level} · ${confidencePct(ph.confidence)}</text>
  </svg>`;
  target.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ─── Summary Stat Card ────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, color,
}: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className="flex flex-col gap-0.5 bg-white/[0.04] border border-white/[0.08] rounded-xl p-3">
      <span className={cn('text-2xl font-bold tabular-nums font-mono', color)}>{value}</span>
      <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">{label}</span>
      {sub && <span className="text-[10px] text-white/30">{sub}</span>}
    </div>
  );
}

export type MainView = 'video' | 'gallery' | 'map' | 'upload';

// ─── Main VideoAnalysisPage Component ────────────────────────────────────────
export function VideoAnalysisPage() {
  const { setVideoResult, setVideoAnalyzing, isVideoAnalyzing, videoResult, mergeVideoAlerts, flyTo, setCurrentPage } = useAppStore();

  // Top navigation view mode
  const [mainView, setMainView] = useState<MainView>('video');
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  // Upload & processing state
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [processingPhase, setProcessingPhase] = useState<string>('');
  const [syncDone, setSyncDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Model parameters
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.35);
  const [sampleEveryN, setSampleEveryN] = useState<number>(10);
  const [autoSaveDb, setAutoSaveDb] = useState<boolean>(true);

  // Video playback & overlay synchronization
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [activeOnScreenPotholes, setActiveOnScreenPotholes] = useState<PotholeDetection[]>([]);

  // Selected pothole for map & photo modal
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);
  const [photoModalPothole, setPhotoModalPothole] = useState<PotholeDetection | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'medium' | 'low'>('all');

  // Screen size & layout mode
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const [showInspector, setShowInspector] = useState<boolean>(true);

  // Database save & delete state
  const [isSavingDb, setIsSavingDb] = useState<boolean>(false);
  const [isSavedInDb, setIsSavedInDb] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteToast, setDeleteToast] = useState<{ message: string; id: string } | null>(null);

  // Load initial demo video on first mount if no video selected
  useEffect(() => {
    if (!videoObjectUrl) {
      setVideoObjectUrl('/demo_pothole_road.mp4');
    }
  }, [videoObjectUrl]);

  // Reload video media when source URL changes
  useEffect(() => {
    if (videoRef.current && videoObjectUrl) {
      videoRef.current.load();
      setCurrentTime(0);
    }
  }, [videoObjectUrl]);

  // Handle uploaded video file
  const handleFile = (file: File) => {
    const validExts = /\.(mp4|avi|mov|webm)$/i;
    if (!file.type.startsWith('video/') && !file.name.match(validExts)) {
      setError('Please upload a valid video file (MP4, AVI, MOV, WebM).');
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setError('File too large. Maximum size is 500 MB.');
      return;
    }
    setError(null);
    setSelectedFile(file);

    // Create browser URL for instant playback
    if (videoObjectUrl && videoObjectUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoObjectUrl);
    }
    const newUrl = URL.createObjectURL(file);
    setVideoObjectUrl(newUrl);
    setVideoResult(null);
    setSyncDone(false);
    setSelectedDetectionId(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // Load the pre-packaged LearnOpenCV sample road video
  const handleLoadSampleVideo = async () => {
    setError(null);
    try {
      const response = await fetch('/demo_pothole_road.mp4');
      const blob = await response.blob();
      const file = new File([blob], 'demo_pothole_road.mp4', { type: 'video/mp4' });
      setSelectedFile(file);
      setVideoObjectUrl('/demo_pothole_road.mp4');
      setVideoResult(null);
      setSyncDone(false);
    } catch (err: any) {
      setError(`Failed to load sample video: ${err.message}`);
    }
  };

  // ─── Process Video with YOLO Model ──────────────────────────────────────────
  const executeVideoAnalysis = async (fileToProcess: File) => {
    setError(null);
    setVideoAnalyzing(true);
    setProgress(5);
    setProcessingPhase('Uploading video stream to AI engine…');

    const ticker = setInterval(() => {
      setProgress(p => {
        if (p < 30) {
          setProcessingPhase('Decompressing video frames with OpenCV…');
          return p + 4;
        } else if (p < 75) {
          setProcessingPhase('Running YOLOv8 neural detection & severity classification…');
          return p + 3;
        } else if (p < 92) {
          setProcessingPhase('Cropping pothole snapshot photos & persisting alerts…');
          return p + 1.5;
        }
        return p;
      });
    }, 600);

    try {
      const result = await analyzeVideoFile({
        file: fileToProcess,
        busId: `ROAD-${Date.now().toString(36).toUpperCase()}`,
        confidenceThreshold,
        sampleEveryNFrames: sampleEveryN,
        saveToDb: autoSaveDb,
      });

      setProgress(100);
      setProcessingPhase('Analysis complete! Synchronized bounding boxes and photo captures ready.');
      setVideoResult(result);
      setIsSavedInDb(autoSaveDb);
      setShowSuccessBanner(true);

      // Auto-sync into app store so alerts appear across map & incidents
      if (result.alerts?.length) {
        mergeVideoAlerts(result.alerts as Alert[]);
        setSyncDone(true);
      }

      // Automatically switch to Watch Video mode and select the first pothole!
      setMainView('video');
      if (result.potholes && result.potholes.length > 0) {
        setSelectedDetectionId(result.potholes[0].detection_id);
      }

      // Automatically start playback from start so user immediately sees identified potholes!
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play().then(() => {
            setIsPlaying(true);
          }).catch(e => console.warn('Auto-play warning:', e));
        }
      }, 400);
    } catch (err: any) {
      setError(`Analysis failed: ${err.message ?? 'Unknown error'}`);
    } finally {
      clearInterval(ticker);
      setVideoAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    let fileToProcess = selectedFile;
    if (!fileToProcess) {
      try {
        const response = await fetch('/demo_pothole_road.mp4');
        const blob = await response.blob();
        fileToProcess = new File([blob], 'pothole video-1.mp4', { type: 'video/mp4' });
        setSelectedFile(fileToProcess);
      } catch (e: any) {
        setError('Could not prepare video for analysis: ' + e.message);
        return;
      }
    }
    await executeVideoAnalysis(fileToProcess);
  };

  // ─── Direct Demo Video Analysis ───────────────────────────────────────────
  const handleAnalyzeDemoVideo = async () => {
    setError(null);
    try {
      const response = await fetch('/demo_pothole_road.mp4');
      const blob = await response.blob();
      const file = new File([blob], 'pothole video-1.mp4', { type: 'video/mp4' });
      setSelectedFile(file);
      setVideoObjectUrl('/demo_pothole_road.mp4');
      await executeVideoAnalysis(file);
    } catch (e: any) {
      setError('Could not prepare demo video for analysis: ' + e.message);
    }
  };

  // ─── Synchronized Video Canvas Overlay ───────────────────────────────────────
  const drawOverlay = useCallback(() => {
    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas pixel buffer to displayed video size
    if (video.videoWidth > 0 && (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showBoundingBoxes) {
      rafRef.current = requestAnimationFrame(drawOverlay);
      return;
    }

    const curTime = video.currentTime;
    setCurrentTime(curTime);

    // Active potholes in current time window (± 0.9s, or selected pothole up to ± 1.8s)
    const allPotholes = videoResult?.potholes || [];
    const active = allPotholes.filter(p => {
      const ts = p.timestamp_sec ?? (p.frame_idx / (videoResult?.video_info?.fps || 25));
      const isSel = selectedDetectionId === p.detection_id;
      const window = isSel ? 1.8 : 0.9;
      return Math.abs(ts - curTime) <= window;
    });

    setActiveOnScreenPotholes(active);

    const sevColors: Record<number, string> = { 1: '#22c55e', 2: '#f59e0b', 3: '#ef4444' };
    const sevLabels: Record<number, string> = { 1: 'LOW', 2: 'MEDIUM', 3: 'CRITICAL' };

    // Resolution-aware scaling factor (default baseline 1280px)
    const scale = Math.max(1, (canvas.width || 1280) / 1280);

    active.forEach(ph => {
      if (!ph.bounding_box) return;
      const [bx, by, bw, bh] = ph.bounding_box;
      const color = sevColors[ph.severity_level] ?? '#ef4444';
      const isSelected = selectedDetectionId === ph.detection_id;

      // 1. Semi-transparent fill highlight
      ctx.fillStyle = color + (isSelected ? '44' : '22');
      ctx.fillRect(bx, by, bw, bh);

      // 2. High-contrast bounding border
      ctx.strokeStyle = isSelected ? '#4ef2bb' : color;
      ctx.lineWidth = isSelected ? 4 * scale : 2.5 * scale;
      ctx.strokeRect(bx, by, bw, bh);

      // 3. Precision corner brackets (YOLOv8 visual style)
      const cLen = Math.min(20 * scale, bw / 3, bh / 3);
      ctx.lineWidth = 4 * scale;
      ctx.beginPath();
      // Top-Left
      ctx.moveTo(bx, by + cLen); ctx.lineTo(bx, by); ctx.lineTo(bx + cLen, by);
      // Top-Right
      ctx.moveTo(bx + bw - cLen, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cLen);
      // Bottom-Left
      ctx.moveTo(bx, by + bh - cLen); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + cLen, by + bh);
      // Bottom-Right
      ctx.moveTo(bx + bw - cLen, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - cLen);
      ctx.stroke();

      // 4. Pill badge with severity & confidence
      const label = isSelected
        ? `🎯 SELECTED DEFECT · ${sevLabels[ph.severity_level]} ${(ph.confidence * 100).toFixed(0)}%`
        : `POTHOLE · ${sevLabels[ph.severity_level]} ${(ph.confidence * 100).toFixed(0)}%`;

      const fontSize = Math.round(13 * scale);
      ctx.font = `bold ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
      const tw = ctx.measureText(label).width;
      const badgeH = Math.round(24 * scale);
      const badgeY = Math.max(by - badgeH, 0);

      ctx.fillStyle = isSelected ? '#4ef2bb' : color;
      ctx.fillRect(bx, badgeY, tw + (14 * scale), badgeH);

      ctx.fillStyle = isSelected ? '#060910' : '#ffffff';
      ctx.fillText(label, bx + (7 * scale), badgeY + (fontSize * 1.05));
    });

    rafRef.current = requestAnimationFrame(drawOverlay);
  }, [showBoundingBoxes, videoResult, selectedDetectionId]);

  // Start / stop drawing loop
  useEffect(() => {
    rafRef.current = requestAnimationFrame(drawOverlay);
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawOverlay]);

  // ─── Playback Controls ──────────────────────────────────────────────────────
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const seekToTimestamp = (sec: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(sec, v.duration || sec));
    setCurrentTime(v.currentTime);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // ─── Jump video to selected pothole & display photo ────────────────────────
  const handleSelectPothole = (ph: PotholeDetection, openPhotoModal: boolean = true) => {
    setSelectedDetectionId(ph.detection_id);
    const ts = ph.timestamp_sec ?? (ph.frame_idx / (videoResult?.video_info?.fps || 25));
    seekToTimestamp(ts);
    flyTo(ph.lat, ph.long);
    if (openPhotoModal) {
      setPhotoModalPothole(ph);
    }
  };

  // ─── Filtered potholes ──────────────────────────────────────────────────────
  const allPotholes = videoResult?.potholes || [];
  const selectedPothole = allPotholes.find(p => p.detection_id === selectedDetectionId) || allPotholes[0] || null;

  const handleNextPothole = () => {
    if (allPotholes.length === 0) return;
    const curIdx = allPotholes.findIndex(p => p.detection_id === selectedDetectionId);
    const nextIdx = (curIdx + 1) % allPotholes.length;
    handleSelectPothole(allPotholes[nextIdx], false);
  };

  const handlePrevPothole = () => {
    if (allPotholes.length === 0) return;
    const curIdx = allPotholes.findIndex(p => p.detection_id === selectedDetectionId);
    const prevIdx = (curIdx - 1 + allPotholes.length) % allPotholes.length;
    handleSelectPothole(allPotholes[prevIdx], false);
  };

  const filteredPotholes = allPotholes.filter(p => {
    if (activeTab === 'critical') return p.severity_level === 3;
    if (activeTab === 'medium') return p.severity_level === 2;
    if (activeTab === 'low') return p.severity_level === 1;
    return true;
  });

  const criticalCount = allPotholes.filter(p => p.severity_level === 3).length;
  const mediumCount = allPotholes.filter(p => p.severity_level === 2).length;
  const lowCount = allPotholes.filter(p => p.severity_level === 1).length;

  const mapPoints: [number, number][] = allPotholes.map(p => [p.lat, p.long] as [number, number]);
  const mapCenter: [number, number] = mapPoints.length > 0 ? mapPoints[0] : [28.6139, 77.2090];

  // ─── Delete Pothole (from session & SQLite database) ───────────────────────
  const handleDeletePothole = async (detectionId: string) => {
    if (!videoResult) return;
    setDeletingId(detectionId);

    try {
      await deleteVideoPothole(detectionId);
    } catch (err) {
      console.warn('Backend delete error:', err);
    }

    const updatedPotholes = videoResult.potholes.filter(p => p.detection_id !== detectionId);
    const updatedAlerts = (videoResult.alerts || []).filter(
      a => a.id !== detectionId && a.id !== `VID-${detectionId}`
    );

    const sev1 = updatedPotholes.filter(p => p.severity_level === 1).length;
    const sev2 = updatedPotholes.filter(p => p.severity_level === 2).length;
    const sev3 = updatedPotholes.filter(p => p.severity_level === 3).length;

    const updatedResult: VideoAnalysisResult = {
      ...videoResult,
      potholes: updatedPotholes,
      alerts: updatedAlerts,
      summary: {
        ...videoResult.summary,
        total_potholes: updatedPotholes.length,
        severity_level_1: sev1,
        severity_level_2: sev2,
        severity_level_3: sev3,
      },
    };

    setVideoResult(updatedResult);

    if (photoModalPothole?.detection_id === detectionId) {
      setPhotoModalPothole(null);
    }

    if (selectedDetectionId === detectionId) {
      const nextPh = updatedPotholes[0] || null;
      setSelectedDetectionId(nextPh ? nextPh.detection_id : null);
    }

    setDeletingId(null);
    setDeleteToast({
      message: `Pothole #${detectionId} removed from database & video overlay.`,
      id: detectionId,
    });
    setTimeout(() => setDeleteToast(null), 3500);
  };

  // ─── Batch Delete Minor Level-1 Potholes ───────────────────────────────────
  const handleClearAllLevel1 = async () => {
    if (!videoResult) return;
    const l1Potholes = videoResult.potholes.filter(p => p.severity_level === 1);
    if (l1Potholes.length === 0) return;
    const ids = l1Potholes.map(p => p.detection_id);

    try {
      await deleteVideoPotholesBatch(ids);
    } catch (err) {
      console.warn('Batch delete error:', err);
    }

    const remaining = videoResult.potholes.filter(p => p.severity_level !== 1);
    const remainingAlerts = (videoResult.alerts || []).filter(
      a => !ids.includes(a.id) && !ids.includes(a.id.replace('VID-', ''))
    );
    const sev2 = remaining.filter(p => p.severity_level === 2).length;
    const sev3 = remaining.filter(p => p.severity_level === 3).length;

    setVideoResult({
      ...videoResult,
      potholes: remaining,
      alerts: remainingAlerts,
      summary: {
        ...videoResult.summary,
        total_potholes: remaining.length,
        severity_level_1: 0,
        severity_level_2: sev2,
        severity_level_3: sev3,
      },
    });

    setDeleteToast({
      message: `Cleared ${ids.length} minor Level-1 potholes from database.`,
      id: 'batch-l1',
    });
    setTimeout(() => setDeleteToast(null), 3500);
  };

  // ─── Manual Save / Sync All to Database ────────────────────────────────────
  const handleSaveToDatabase = async () => {
    if (!videoResult) return;
    setIsSavingDb(true);
    try {
      const alertsToSave = videoResult.alerts && videoResult.alerts.length > 0
        ? videoResult.alerts
        : videoResult.potholes.map(p => ({
            id: `VID-${p.detection_id}`,
            type: 'pothole',
            confidence: p.confidence,
            lat: p.lat,
            long: p.long,
            bus_id: 'VIDEO-UPLOAD',
            meta: {
              severity_level: p.severity_level,
              area_pct: p.area_pct,
              depth_score: p.depth_score,
              image_url: p.image_url,
              bounding_box: p.bounding_box,
              timestamp_sec: p.timestamp_sec,
            },
          }));
      await saveVideoAlerts(alertsToSave);
      setIsSavedInDb(true);
      setDeleteToast({
        message: `Successfully saved ${alertsToSave.length} detections to SQLite database.`,
        id: 'db-save',
      });
      setTimeout(() => {
        setDeleteToast(null);
      }, 3500);
    } catch (err) {
      console.error('Error saving alerts to DB:', err);
    } finally {
      setIsSavingDb(false);
    }
  };

  // ─── Delete All Video Detections from Database ──────────────────────────────
  const handleDeleteAllFromDatabase = async () => {
    if (!videoResult) return;
    const confirmDelete = window.confirm(
      `Delete all ${videoResult.potholes.length} detected potholes from the SQLite database (urbaneye.db) and clear from active session?`
    );
    if (!confirmDelete) return;

    try {
      const ids = videoResult.potholes.map(p => p.detection_id);
      await deleteVideoPotholesBatch(ids);
      await clearAllVideoAlerts();
    } catch (err) {
      console.warn('Error clearing detections from database:', err);
    }

    setVideoResult(null);
    setSelectedDetectionId(null);
    setPhotoModalPothole(null);
    setIsSavedInDb(false);
    setDeleteToast({
      message: 'Successfully deleted all detections from SQLite database (urbaneye.db).',
      id: 'all-deleted',
    });
    setTimeout(() => setDeleteToast(null), 3500);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#050810] text-white">
      {/* Dynamic Keyframes */}
      <style>{`
        @keyframes vidPop { from{transform:scale(0);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes vidPulse { 0%{transform:translate(-50%,-50%) scale(1);opacity:.7} 100%{transform:translate(-50%,-50%) scale(2.4);opacity:0} }
        .leaflet-container { background: #0a0f1e !important; }
        .leaflet-popup-content-wrapper {
          background: rgba(10,15,30,0.97) !important;
          border: 1px solid rgba(78,242,187,0.3) !important;
          border-radius: 12px !important;
          color: #e2e8f0 !important;
        }
        .leaflet-popup-tip { display:none !important; }
        .leaflet-popup-content { margin: 0 !important; }
      `}</style>

      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.08] bg-[#070b14] shrink-0">
        <div>
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <span className="text-xl">🎥</span> AI Road Video Defect Analyser
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#4ef2bb]/10 text-[#4ef2bb] border border-[#4ef2bb]/30">
              YOLOv8 + OpenCV
            </span>
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Upload road inspection video · Real-time bounding box overlays · Automatic pothole picture capture &amp; PWD tender reporting
          </p>
        </div>

        <div className="flex items-center gap-3">
          {videoResult && (
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs font-mono">
              <span className="text-red-400 font-bold">🚨 {criticalCount} Critical</span>
              <span className="text-white/20">|</span>
              <span className="text-amber-400 font-bold">⚠️ {mediumCount} Medium</span>
              <span className="text-white/20">|</span>
              <span className="text-green-400 font-bold">🟢 {lowCount} Low</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-[11px] text-white/40 font-mono">
            <span className="w-2 h-2 rounded-full bg-[#4ef2bb] animate-pulse inline-block shadow-[0_0_8px_#4ef2bb]" />
            SIH-26124 · BEL
          </div>
        </div>
      </div>

      {/* ── Primary View Mode Tabs Bar ───────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-[#080d1b] border-b border-white/[0.08] shrink-0">
        <div className="flex items-center gap-2">
          {/* Tab 1: Watch Video with Boxes */}
          <button
            onClick={() => setMainView('video')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border',
              mainView === 'video'
                ? 'bg-[#4ef2bb] text-[#060910] border-[#4ef2bb] shadow-[0_0_16px_rgba(78,242,187,0.35)]'
                : 'bg-white/5 text-white/70 border-white/10 hover:text-white hover:bg-white/10'
            )}
          >
            <span className="text-sm">🎥</span>
            <span>Watch Video with Detection Boxes</span>
            {allPotholes.length > 0 && (
              <span className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold',
                mainView === 'video' ? 'bg-black/20 text-[#060910]' : 'bg-[#4ef2bb]/20 text-[#4ef2bb]'
              )}>
                {allPotholes.length} Boxes Active
              </span>
            )}
          </button>

          {/* Tab 2: Pothole Photo Captures */}
          <button
            onClick={() => setMainView('gallery')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border',
              mainView === 'gallery'
                ? 'bg-[#4ef2bb] text-[#060910] border-[#4ef2bb] shadow-[0_0_16px_rgba(78,242,187,0.35)]'
                : 'bg-white/5 text-white/70 border-white/10 hover:text-white hover:bg-white/10'
            )}
          >
            <span className="text-sm">📸</span>
            <span>Captured Pothole Photos</span>
            <span className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold',
              mainView === 'gallery' ? 'bg-black/20 text-[#060910]' : 'bg-white/10 text-white/70'
            )}>
              {allPotholes.length}
            </span>
          </button>

          {/* Tab 3: GPS Road Map */}
          <button
            onClick={() => setMainView('map')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border',
              mainView === 'map'
                ? 'bg-[#4ef2bb] text-[#060910] border-[#4ef2bb] shadow-[0_0_16px_rgba(78,242,187,0.35)]'
                : 'bg-white/5 text-white/70 border-white/10 hover:text-white hover:bg-white/10'
            )}
          >
            <span className="text-sm">🗺️</span>
            <span>GPS Road Map</span>
          </button>
        </div>

        {/* Tab 4 / Quick Ingestion Action & DB Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pre-Analysis DB Toggle */}
          <label
            title="Toggle whether to automatically save detected potholes into SQLite database (urbaneye.db)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] text-[11px] text-white/80 cursor-pointer hover:bg-white/[0.08] transition-all select-none"
          >
            <input
              type="checkbox"
              checked={autoSaveDb}
              onChange={(e) => setAutoSaveDb(e.target.checked)}
              className="rounded accent-[#4ef2bb]"
            />
            <span className="font-mono">Auto-Save DB</span>
          </label>

          {/* Direct Demo Video Analysis Action */}
          <button
            onClick={handleAnalyzeDemoVideo}
            disabled={isVideoAnalyzing}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 shadow-md',
              isVideoAnalyzing
                ? 'bg-white/10 text-white/40 cursor-not-allowed border-white/10'
                : 'bg-gradient-to-r from-[#4ef2bb]/25 via-[#4ef2bb]/15 to-transparent text-[#4ef2bb] border-[#4ef2bb]/50 hover:bg-[#4ef2bb]/30 hover:border-[#4ef2bb]'
            )}
            title="Run YOLOv8 AI detection on the demo video (pothole video-1.mp4)"
          >
            <span>⚡</span>
            <span>{isVideoAnalyzing ? 'Analysing Demo…' : 'Analyse Demo Video'}</span>
          </button>

          {/* Post-Analysis Database Controls */}
          {videoResult && (
            <div className="flex items-center gap-1.5">
              {isSavedInDb ? (
                <>
                  <span className="px-2 py-1 rounded-lg text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    ✓ Stored in SQLite
                  </span>
                  <button
                    onClick={handleDeleteAllFromDatabase}
                    title="Delete all current video detections from the SQLite database"
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center gap-1 shadow-sm"
                  >
                    <span>🗑️</span>
                    <span>Delete from DB</span>
                  </button>
                </>
              ) : (
                <>
                  <span className="px-2 py-1 rounded-lg text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    ⚠️ Memory Only
                  </span>
                  <button
                    onClick={handleSaveToDatabase}
                    disabled={isSavingDb}
                    title="Store all detections in the SQLite database (urbaneye.db)"
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 flex items-center gap-1 shadow-sm"
                  >
                    <span>💾</span>
                    <span>{isSavingDb ? 'Saving…' : 'Store in DB'}</span>
                  </button>
                </>
              )}
            </div>
          )}

          <button
            onClick={() => setMainView(mainView === 'upload' ? 'video' : 'upload')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5',
              mainView === 'upload'
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                : 'bg-white/5 text-white/70 border-white/10 hover:text-white hover:bg-white/10'
            )}
          >
            <span>📤</span>
            <span>{mainView === 'upload' ? '← Back to Video' : 'Upload New Video'}</span>
          </button>
        </div>
      </div>

      {/* ── Active AI Analysis Progress HUD (Visible on all views while running) ─ */}
      <AnimatePresence>
        {isVideoAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-6 mt-3 p-3.5 rounded-xl bg-[#091124] border border-[#4ef2bb]/60 shadow-[0_0_25px_rgba(78,242,187,0.25)] flex flex-col gap-2 shrink-0"
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-2 text-white font-bold">
                <span className="w-3.5 h-3.5 border-2 border-[#4ef2bb] border-t-transparent rounded-full animate-spin" />
                AI Vision Engine Processing: <span className="text-[#4ef2bb]">{selectedFile ? selectedFile.name : 'pothole video-1.mp4'}</span>
              </span>
              <span className="text-[#4ef2bb] font-bold">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#4ef2bb] h-full rounded-full transition-all duration-300 shadow-[0_0_10px_#4ef2bb]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[11px] text-[#4ef2bb]/90 font-mono text-center animate-pulse">
              {processingPhase}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Unmissable Post-Analysis Success Banner ──────────────────────────── */}
      <AnimatePresence>
        {showSuccessBanner && videoResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-6 mt-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#4ef2bb]/20 via-[#4ef2bb]/10 to-transparent border border-[#4ef2bb]/40 flex items-center justify-between shadow-lg shrink-0"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-bounce">🎉</span>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  AI Detection Complete: <span className="text-[#4ef2bb] font-mono">{allPotholes.length} Potholes Identified with Bounding Boxes</span>
                </h4>
                <p className="text-[11px] text-white/70">
                  Bounding boxes are synchronized with video playback. Unique cropped photos saved for every pothole.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setMainView('video');
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                    videoRef.current.play();
                    setIsPlaying(true);
                  }
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#4ef2bb] text-[#060910] text-xs font-bold shadow-[0_0_12px_rgba(78,242,187,0.4)] hover:bg-[#3de0aa] transition-all flex items-center gap-1.5"
              >
                <span>▶️</span> Watch Video with Boxes
              </button>
              <button
                onClick={() => setMainView('gallery')}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all"
              >
                📸 Browse {allPotholes.length} Photos
              </button>
              <button
                onClick={() => setShowSuccessBanner(false)}
                className="text-white/40 hover:text-white px-1.5 text-sm"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Layout ─────────────────────────────────────────────────────── */}
      {mainView === 'video' && (
        <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL: Video Player & Bounding Box Overlay ───────────────── */}
        <div className="flex-1 flex flex-col overflow-y-auto border-r border-white/[0.08] p-4 gap-3.5 bg-[#050810]">

          {/* ── 1. Video Player Container with AI Bounding Box Canvas ───────── */}
          <div className="rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl relative flex flex-col group">
            <div className={cn(
              "relative w-full bg-black flex items-center justify-center overflow-hidden transition-all duration-300",
              isTheaterMode ? "h-[74vh]" : "aspect-video max-h-[66vh]"
            )}>

              {/* Native HTML5 Video Element */}
              <video
                ref={videoRef}
                src={videoObjectUrl || '/demo_pothole_road.mp4'}
                playsInline
                loop
                muted
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    setCurrentTime(videoRef.current.currentTime);
                  }
                }}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setDuration(videoRef.current.duration);
                  }
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="w-full h-full object-contain"
              />

              {/* Real-time Synchronized YOLO Bounding Box Overlay */}
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
              />

              {/* Top Telemetry HUD Overlay */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
                <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10 shadow-lg text-xs font-mono">
                  <span className={cn('w-2 h-2 rounded-full', isPlaying ? 'bg-red-500 animate-pulse' : 'bg-white/40')} />
                  <span className="text-white font-bold">
                    {selectedFile ? selectedFile.name : 'pothole video-1.mp4'}
                  </span>
                  {videoResult && (
                    <span className="text-[#4ef2bb] text-[11px] font-semibold">
                      · {activeOnScreenPotholes.length} Detected in View
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                    className={cn(
                      'pointer-events-auto px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all border shadow-lg backdrop-blur-md',
                      showBoundingBoxes
                        ? 'bg-[#4ef2bb]/20 border-[#4ef2bb]/50 text-[#4ef2bb]'
                        : 'bg-black/70 border-white/20 text-white/50 hover:text-white'
                    )}
                  >
                    {showBoundingBoxes ? '🎯 Boxes: ON' : '👁️ Raw Video'}
                  </button>

                  <button
                    onClick={() => setIsTheaterMode(!isTheaterMode)}
                    className={cn(
                      'pointer-events-auto px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all border shadow-lg backdrop-blur-md flex items-center gap-1.5',
                      isTheaterMode
                        ? 'bg-[#4ef2bb] text-[#060910] border-[#4ef2bb]'
                        : 'bg-black/70 border-white/20 text-white/70 hover:text-white'
                    )}
                    title={isTheaterMode ? 'Exit Big Screen Mode' : 'Expand Video Screen (Big Screen Mode)'}
                  >
                    <span>{isTheaterMode ? '⤢ Normal View' : '⛶ Big Screen'}</span>
                  </button>

                  <button
                    onClick={() => setShowInspector(!showInspector)}
                    className={cn(
                      'pointer-events-auto px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all border shadow-lg backdrop-blur-md flex items-center gap-1',
                      showInspector
                        ? 'bg-white/15 text-white border-white/30'
                        : 'bg-black/70 border-white/20 text-white/50 hover:text-white'
                    )}
                    title="Toggle Inspector Sidebar"
                  >
                    <span>{showInspector ? '◧ Sidebar ON' : '◨ Sidebar OFF'}</span>
                  </button>

                  <div className="bg-black/80 backdrop-blur-md rounded-lg px-2.5 py-1 border border-white/10 text-[11px] font-mono text-white/70">
                    {videoResult?.video_info ? `${videoResult.video_info.fps} FPS · ${videoResult.video_info.resolution}` : '1080p'}
                  </div>
                </div>
              </div>

              {/* Live Identified Defect Pop-up on Video while playing */}
              {activeOnScreenPotholes.length > 0 && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectPothole(activeOnScreenPotholes[0], true);
                  }}
                  className="absolute bottom-3 left-3 z-20 flex items-center gap-2.5 bg-black/90 backdrop-blur-md border border-[#4ef2bb] hover:border-white rounded-xl p-2 cursor-pointer shadow-[0_0_20px_rgba(78,242,187,0.4)] transition-all transform hover:scale-105"
                >
                  <div className="w-12 h-9 rounded-lg overflow-hidden bg-black shrink-0 border border-white/20">
                    <img
                      src={getPotholeImageUrl(activeOnScreenPotholes[0])}
                      alt="Identified Pothole"
                      className="w-full h-full object-cover"
                      onError={(e) => handleImageError(e, activeOnScreenPotholes[0])}
                    />
                  </div>
                  <div className="flex flex-col min-w-0 pr-1 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      <span className="text-[11px] font-bold text-white font-mono">
                        IDENTIFIED DEFECT: #{activeOnScreenPotholes[0].detection_id}
                      </span>
                      <SeverityBadge level={activeOnScreenPotholes[0].severity_level} />
                    </div>
                    <span className="text-[10px] text-[#4ef2bb] font-mono mt-0.5">
                      📸 Click to view snapshot picture ↗
                    </span>
                  </div>
                </div>
              )}

              {/* Play / Pause Big Center Trigger when paused */}
              {!isPlaying && (
                <div
                  onClick={togglePlay}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer z-15 transition-all group-hover:bg-black/40"
                >
                  <div className="w-16 h-16 rounded-full bg-[#4ef2bb] text-[#060910] flex items-center justify-center text-2xl font-bold shadow-[0_0_30px_rgba(78,242,187,0.5)] transform transition-transform hover:scale-110">
                    ▶
                  </div>
                </div>
              )}
            </div>

            {/* ── Timeline Bar with Interactive Pothole Detection Pips ─────── */}
            <div className="px-4 py-2.5 bg-[#090e1a] border-t border-white/[0.08] flex flex-col gap-2">

              {/* Scrubber track with pothole markers */}
              <div className="relative w-full flex items-center">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.05}
                  value={currentTime}
                  onChange={(e) => seekToTimestamp(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg bg-white/10 accent-[#4ef2bb] cursor-pointer z-20"
                />

                {/* Markers on timeline for each pothole detection */}
                {duration > 0 && allPotholes.map(ph => {
                  const ts = ph.timestamp_sec ?? (ph.frame_idx / (videoResult?.video_info?.fps || 25));
                  const pct = Math.min(Math.max((ts / duration) * 100, 0), 100);
                  const color = ph.severity_level === 3 ? '#ef4444' : ph.severity_level === 2 ? '#f59e0b' : '#22c55e';
                  return (
                    <button
                      key={`pip-${ph.detection_id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPothole(ph, true);
                      }}
                      title={`L${ph.severity_level} Pothole at ${ts.toFixed(1)}s (${confidencePct(ph.confidence)})`}
                      style={{ left: `${pct}%`, backgroundColor: color }}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border border-black z-25 hover:scale-150 transition-transform shadow-[0_0_6px_currentColor]"
                    />
                  );
                })}
              </div>

              {/* Controls bar */}
              <div className="flex items-center justify-between text-xs font-mono text-white/70">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="px-3 py-1.5 rounded-lg bg-[#4ef2bb] hover:bg-[#3de0aa] text-[#060910] font-bold transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(78,242,187,0.3)]"
                  >
                    <span>{isPlaying ? '⏸' : '▶'}</span>
                    <span>{isPlaying ? 'Pause Video' : 'Play Detected Video'}</span>
                  </button>

                  <button
                    onClick={() => {
                      seekToTimestamp(0);
                      if (videoRef.current) {
                        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
                      }
                    }}
                    className="p-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all flex items-center gap-1"
                  >
                    <span>⏮</span> Replay All
                  </button>

                  <button
                    onClick={handlePrevPothole}
                    title="Jump to Previous Pothole"
                    className="p-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all flex items-center gap-1"
                  >
                    <span>⏮</span> Prev Defect
                  </button>

                  <button
                    onClick={handleNextPothole}
                    title="Jump to Next Pothole"
                    className="p-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all flex items-center gap-1"
                  >
                    <span>⏭</span> Next Defect
                  </button>

                  <span className="tabular-nums font-semibold text-white">
                    {currentTime.toFixed(1)}s <span className="text-white/30">/</span> {duration.toFixed(1)}s
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/40">Speed:</span>
                  {[0.5, 1.0, 1.5, 2.0].map(s => (
                    <button
                      key={s}
                      onClick={() => handleSpeedChange(s)}
                      className={cn(
                        'px-2 py-0.5 rounded text-[11px] font-bold transition-all',
                        playbackSpeed === s
                          ? 'bg-[#4ef2bb] text-[#060910]'
                          : 'bg-white/5 text-white/60 hover:text-white'
                      )}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. Synchronized Defect Reel (Click any to inspect & seek) ─── */}
          <div className="flex flex-col gap-2 p-3 bg-[#080d1a] border border-white/[0.08] rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>🎞️</span> Synchronized Defect Reel ({allPotholes.length})
                </span>
                <span className="text-[10px] text-white/40 font-mono">
                  · Click any defect to jump video &amp; view picture
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-[10px] text-white/50 font-mono">
                {lowCount > 0 && (
                  <button
                    onClick={handleClearAllLevel1}
                    title="Remove minor Level-1 potholes from detection & database"
                    className="px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 flex items-center gap-1 transition-all"
                  >
                    <span>🗑️</span>
                    <span>Clear {lowCount} Minor (L1)</span>
                  </button>
                )}
                <span>Active in Frame: <strong className="text-[#4ef2bb]">{activeOnScreenPotholes.length}</strong></span>
              </div>
            </div>

            {allPotholes.length > 0 ? (
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 pt-0.5">
                {allPotholes.map((ph) => {
                  const ts = ph.timestamp_sec ?? (ph.frame_idx / (videoResult?.video_info?.fps || 25));
                  const isSelected = selectedDetectionId === ph.detection_id;
                  const isLive = activeOnScreenPotholes.some(a => a.detection_id === ph.detection_id);
                  const sv = SEVERITY_VISUALS[ph.severity_level];

                  return (
                    <div
                      key={`reel-${ph.detection_id}`}
                      onClick={() => handleSelectPothole(ph, false)}
                      className={cn(
                        'shrink-0 w-44 rounded-xl overflow-hidden border transition-all cursor-pointer bg-[#0a0f22] p-1.5 flex flex-col gap-1.5 group hover:border-[#4ef2bb]/50',
                        isLive
                          ? 'border-red-500 ring-2 ring-red-500/80 bg-red-500/10 shadow-[0_0_16px_rgba(239,68,68,0.4)]'
                          : isSelected
                          ? 'border-[#4ef2bb] ring-2 ring-[#4ef2bb]/60 bg-[#4ef2bb]/10 shadow-[0_0_16px_rgba(78,242,187,0.3)]'
                          : 'border-white/10'
                      )}
                    >
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                        <img
                          src={getPotholeImageUrl(ph)}
                          alt={ph.detection_id}
                          onError={(e) => handleImageError(e, ph)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePothole(ph.detection_id);
                          }}
                          title="Remove this pothole detection"
                          className="opacity-0 group-hover:opacity-100 absolute top-1 right-1 bg-red-600/90 hover:bg-red-600 text-white w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shadow-md transition-opacity z-30"
                        >
                          ✕
                        </button>
                        <div className="absolute top-1 left-1">
                          <span className={cn('text-[9px] font-black px-1.5 py-0.5 rounded border', sv.bgClass, sv.textClass, sv.borderClass)}>
                            L{ph.severity_level}
                          </span>
                        </div>
                        {isLive && (
                          <div className="absolute top-1 right-7 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse">
                            IN FRAME
                          </div>
                        )}
                        <div className="absolute bottom-1 right-1 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-mono text-white/80">
                          ⏱️ {ts.toFixed(1)}s
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono px-0.5">
                        <span className="font-bold text-white">#{ph.detection_id}</span>
                        <span className="text-[#4ef2bb]">{confidencePct(ph.confidence)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center flex flex-col items-center justify-center gap-2.5 bg-white/[0.01] rounded-xl border border-dashed border-white/10">
                <span className="text-2xl">⚡</span>
                <div>
                  <p className="text-xs font-bold text-white">No detections active for this video yet</p>
                  <p className="text-[11px] text-white/40 mt-0.5">Run YOLOv8 neural detection on the demo video to identify potholes with bounding boxes.</p>
                </div>
                <button
                  onClick={handleAnalyzeDemoVideo}
                  disabled={isVideoAnalyzing}
                  className="mt-1 px-4 py-2 rounded-xl bg-[#4ef2bb] text-[#060910] text-xs font-bold hover:bg-[#3de0aa] shadow-[0_0_15px_rgba(78,242,187,0.3)] transition-all flex items-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>{isVideoAnalyzing ? 'Processing Demo Video…' : 'Analyse Demo Video (pothole video-1.mp4)'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: Defect Inspector, Mini Map & Stats ───────────── */}
        <div className={cn(
          "shrink-0 flex flex-col overflow-y-auto bg-[#070b14] border-l border-white/[0.08] transition-all duration-300",
          isTheaterMode || !showInspector ? "w-0 hidden" : "w-[360px] xl:w-[390px]"
        )}>

          {/* ── Selected Pothole Snapshot Viewer Panel ─────────────────────── */}
          {(() => {
            const selectedPh = allPotholes.find(p => p.detection_id === selectedDetectionId) || allPotholes[0];
            if (!selectedPh) return (
              <div className="p-6 text-center flex flex-col items-center justify-center gap-3 border-b border-white/[0.08] bg-white/[0.02]">
                <span className="text-2xl">🕳️</span>
                <div>
                  <h4 className="text-xs font-bold text-white">Awaiting Video Detection</h4>
                  <p className="text-[11px] text-white/50 mt-1">
                    Analyse the road video to generate unique defect snapshots and bounding boxes.
                  </p>
                </div>
                <button
                  onClick={handleAnalyzeDemoVideo}
                  disabled={isVideoAnalyzing}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#4ef2bb] text-[#060910] text-xs font-bold hover:bg-[#3de0aa] shadow-[0_0_15px_rgba(78,242,187,0.3)] transition-all flex items-center justify-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>{isVideoAnalyzing ? 'Analysing Demo Video…' : 'Analyse Demo Video'}</span>
                </button>
              </div>
            );
            const ts = selectedPh.timestamp_sec ?? (selectedPh.frame_idx / (videoResult?.video_info?.fps || 25));

            return (
              <div className="p-4 border-b border-white/[0.08] bg-white/[0.02] flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">📸</span>
                    <span className="text-xs font-bold text-white font-mono">
                      Defect Snapshot: #{selectedPh.detection_id}
                    </span>
                  </div>
                  <SeverityBadge level={selectedPh.severity_level} />
                </div>

                <div 
                  onClick={() => setPhotoModalPothole(selectedPh)}
                  className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/20 cursor-pointer group shadow-xl"
                >
                  <img
                    src={getPotholeImageUrl(selectedPh)}
                    alt="Selected Pothole"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => handleImageError(e, selectedPh)}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-white gap-1">
                    🔍 Click to Enlarge Picture
                  </div>
                  <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono text-white/90">
                    ⏱️ {ts.toFixed(1)}s
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.06] text-xs font-mono">
                  <div>
                    <span className="text-white/40 block text-[10px]">Confidence</span>
                    <span className="text-white font-bold">{confidencePct(selectedPh.confidence)}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px]">Depth Score</span>
                    <span className="text-white font-bold">{selectedPh.depth_score.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px]">Road Area</span>
                    <span className="text-white font-bold">{selectedPh.area_pct.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px]">GPS Geotag</span>
                    <span className="text-[#4ef2bb] font-bold truncate block">{formatGPS(selectedPh.lat, selectedPh.long)}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                  <strong className="block mb-0.5 text-[10px] uppercase font-mono text-red-400">Action Directive:</strong>
                  <span>{selectedPh.action_required}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => seekToTimestamp(ts)}
                    className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/90 transition-colors"
                  >
                    ⏱️ Seek Video to {ts.toFixed(1)}s
                  </button>
                  <button
                    onClick={() => downloadWorkOrderPdf(selectedPh.detection_id)}
                    className="px-3 py-1.5 rounded-lg bg-[#4ef2bb] hover:bg-[#3de0aa] text-[#060910] text-xs font-bold transition-colors flex items-center gap-1 shadow-[0_0_12px_rgba(78,242,187,0.3)]"
                  >
                    <span>📄</span> PWD PDF
                  </button>
                </div>

                {/* Direct Delete / Remove Detected Pothole Button */}
                <div className="pt-1 border-t border-white/[0.08]">
                  <button
                    onClick={() => handleDeletePothole(selectedPh.detection_id)}
                    disabled={deletingId === selectedPh.detection_id}
                    className="w-full py-2 px-3 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm hover:shadow-red-500/20"
                  >
                    <span>🗑️</span>
                    <span>{deletingId === selectedPh.detection_id ? 'Removing Pothole...' : `Remove / Delete Pothole #${selectedPh.detection_id}`}</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* ── Middle Section: Mini Map Geotagging ────────────────────── */}
          <div className="h-[220px] relative border-b border-white/[0.08] shrink-0">
            <MapContainer
              center={selectedPothole ? [selectedPothole.lat, selectedPothole.long] : mapCenter}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; OpenStreetMap &copy; CARTO'
              />
              <MapFit points={selectedPothole ? [[selectedPothole.lat, selectedPothole.long]] : mapPoints} />

              {selectedPothole && (
                <Marker
                  position={[selectedPothole.lat, selectedPothole.long]}
                  icon={makeSeverityIcon(selectedPothole.severity_level)}
                />
              )}
            </MapContainer>

            <div className="absolute bottom-2 left-2 z-[999] bg-black/80 backdrop-blur-md rounded px-2 py-1 text-[10px] font-mono text-white/70 border border-white/10">
              📍 {selectedPothole ? formatGPS(selectedPothole.lat, selectedPothole.long) : 'Road GPS Location'}
            </div>
          </div>

          {/* ── Lower Section: Summary Stats & Sync Actions ───────────────── */}
          <div className="p-4 flex flex-col gap-3 bg-[#060910] mt-auto">
            {videoResult ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <StatCard label="Potholes" value={allPotholes.length} color="text-white" />
                  <StatCard label="Critical" value={criticalCount} color="text-red-400" />
                  <StatCard label="Fleet DB" value={videoResult.db_ingested_count ?? allPotholes.length} sub="Ingested" color="text-[#4ef2bb]" />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (videoResult.alerts) {
                        mergeVideoAlerts(videoResult.alerts as Alert[]);
                        setSyncDone(true);
                      }
                    }}
                    disabled={syncDone}
                    className={cn(
                      'flex-1 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5',
                      syncDone
                        ? 'bg-[#4ef2bb]/15 border-[#4ef2bb]/40 text-[#4ef2bb]'
                        : 'bg-white/5 border-white/15 text-white hover:bg-white/10'
                    )}
                  >
                    {syncDone ? '✅ Alerts Synced to Fleet DB' : '🔄 Sync to Global Map'}
                  </button>

                  <button
                    onClick={() => setCurrentPage('dashboard')}
                    className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/70 hover:text-white transition-all"
                  >
                    → Dashboard
                  </button>
                </div>

                {/* Database Management Card */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <span>🗄️</span> SQLite Database (urbaneye.db)
                    </span>
                    {isSavedInDb ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        ✓ Stored in DB
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Memory Only
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleSaveToDatabase}
                      disabled={isSavingDb || isSavedInDb}
                      className={cn(
                        'py-2 px-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5',
                        isSavedInDb
                          ? 'bg-emerald-500/10 text-emerald-400/60 border-emerald-500/20 cursor-default'
                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                      )}
                    >
                      <span>💾</span>
                      <span>{isSavedInDb ? 'Saved in DB' : isSavingDb ? 'Saving…' : 'Save to DB'}</span>
                    </button>

                    <button
                      onClick={handleDeleteAllFromDatabase}
                      className="py-2 px-2 rounded-lg text-xs font-bold transition-all border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center gap-1.5"
                    >
                      <span>🗑️</span>
                      <span>Delete All DB</span>
                    </button>
                  </div>

                  {lowCount > 0 && (
                    <button
                      onClick={handleClearAllLevel1}
                      className="w-full py-1.5 rounded-lg text-[11px] font-medium border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/15 text-amber-300 flex items-center justify-center gap-1 transition-colors"
                    >
                      <span>🧹</span>
                      <span>Clear {lowCount} Low (Level-1) Potholes from DB</span>
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-2 text-white/30 text-xs font-mono">
                Awaiting video upload &amp; execution…
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW 2: CAPTURED POTHOLE PHOTO GALLERY
      ══════════════════════════════════════════════════════════════════════ */}
      {mainView === 'gallery' && (
        <div className="flex-1 flex flex-col overflow-y-auto p-6 gap-4 bg-[#050810]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>📸</span> Captured Pothole Photo Snapshots ({filteredPotholes.length})
              </h2>
              <p className="text-xs text-white/40 mt-0.5">
                Individual cropped defect photos captured by YOLO during video processing. Click any photo to inspect or watch in video.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.08] text-xs">
              {(['all', 'critical', 'medium', 'low'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-3 py-1 rounded-lg font-semibold transition-all capitalize',
                    activeTab === tab
                      ? 'bg-[#4ef2bb] text-[#060910] shadow-[0_0_12px_rgba(78,242,187,0.3)]'
                      : 'text-white/50 hover:text-white'
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {filteredPotholes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredPotholes.map(ph => {
                const sv = SEVERITY_VISUALS[ph.severity_level];
                const ts = ph.timestamp_sec ?? (ph.frame_idx / (videoResult?.video_info?.fps || 25));
                const isSelected = selectedDetectionId === ph.detection_id;

                return (
                  <div
                    key={ph.detection_id}
                    className={cn(
                      'flex flex-col rounded-xl overflow-hidden bg-white/[0.03] border transition-all group hover:border-[#4ef2bb]/50 hover:bg-white/[0.06]',
                      isSelected ? 'border-[#4ef2bb] ring-2 ring-[#4ef2bb]/40 bg-[#4ef2bb]/5' : 'border-white/[0.08]'
                    )}
                  >
                    <div
                      onClick={() => setPhotoModalPothole(ph)}
                      className="relative aspect-video bg-black/50 overflow-hidden cursor-pointer"
                    >
                      <img
                        src={getPotholeImageUrl(ph)}
                        alt={`Pothole ${ph.detection_id}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => handleImageError(e, ph)}
                      />
                      <div className="absolute top-2 left-2">
                        <SeverityBadge level={ph.severity_level} />
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono text-white/80">
                        ⏱️ {ts.toFixed(1)}s
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold text-white gap-1">
                        🔍 Enlarge Photo
                      </div>
                    </div>

                    <div className="p-3 flex flex-col gap-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white font-mono">#{ph.detection_id}</span>
                        <span className="text-white/50 font-mono">{confidencePct(ph.confidence)}</span>
                      </div>
                      <p className="text-[10px] text-white/40 font-mono truncate">{formatGPS(ph.lat, ph.long)}</p>
                      <p className={cn('text-[11px] font-medium line-clamp-1', sv.textClass)}>
                        {ph.action_required}
                      </p>

                      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/[0.06]">
                        <button
                          onClick={() => {
                            handleSelectPothole(ph, false);
                            setMainView('video');
                            if (videoRef.current) {
                              videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
                            }
                          }}
                          className="flex-1 py-1.5 rounded-lg bg-[#4ef2bb]/15 hover:bg-[#4ef2bb]/25 border border-[#4ef2bb]/30 text-[#4ef2bb] text-[11px] font-bold text-center transition-colors flex items-center justify-center gap-1"
                        >
                          <span>🎥</span> Watch in Video
                        </button>
                        <button
                          onClick={() => downloadWorkOrderPdf(ph.detection_id)}
                          title="Generate PWD Work Order PDF"
                          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-[11px] font-semibold transition-colors"
                        >
                          📄 PDF
                        </button>
                        <button
                          onClick={() => handleDeletePothole(ph.detection_id)}
                          disabled={deletingId === ph.detection_id}
                          title="Delete pothole from detections & database"
                          className="px-2 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-[11px] font-semibold transition-colors flex items-center justify-center"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center bg-white/[0.01]">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-sm font-semibold text-white/70">No pothole captures to display</p>
              <p className="text-xs text-white/40 mt-1">
                Click &quot;Upload New Video&quot; or run analysis on the video to generate unique pothole photo captures.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW 3: GPS ROAD MAP
      ══════════════════════════════════════════════════════════════════════ */}
      {mainView === 'map' && (
        <div className="flex-1 relative">
          <MapContainer
            center={mapCenter}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; CARTO'
            />
            <MapFit points={mapPoints} />

            {allPotholes.map(ph => (
              <Marker
                key={`map-pin-${ph.detection_id}`}
                position={[ph.lat, ph.long]}
                icon={makeSeverityIcon(ph.severity_level)}
              >
                <Popup>
                  <div className="p-2 min-w-[220px]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">🕳️</span>
                      <div>
                        <p className="text-xs font-bold text-white">Pothole #{ph.detection_id}</p>
                        <SeverityBadge level={ph.severity_level} />
                      </div>
                    </div>

                    <div className="w-full h-24 rounded-lg overflow-hidden mb-2 bg-black">
                      <img
                        src={getPotholeImageUrl(ph)}
                        alt="Pothole Snapshot"
                        className="w-full h-full object-cover"
                        onError={(e) => handleImageError(e, ph)}
                      />
                    </div>

                    <div className="space-y-0.5 text-[10px] text-white/70 font-mono">
                      <p><span className="text-white/40">Timestamp:</span> {ph.timestamp_sec?.toFixed(1) ?? '0.0'}s</p>
                      <p><span className="text-white/40">GPS:</span> {formatGPS(ph.lat, ph.long)}</p>
                      <p><span className="text-white/40">Confidence:</span> {confidencePct(ph.confidence)}</p>
                    </div>

                    <button
                      onClick={() => {
                        handleSelectPothole(ph, false);
                        setMainView('video');
                        if (videoRef.current) {
                          videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
                        }
                      }}
                      className="mt-2 w-full py-1.5 rounded-lg bg-[#4ef2bb] text-[#060910] text-[11px] font-bold flex items-center justify-center gap-1"
                    >
                      <span>🎥</span> Watch in Video at this Spot
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          <div className="absolute bottom-4 left-4 z-[999] bg-black/80 backdrop-blur-md rounded-xl p-3 text-xs border border-white/10 space-y-1 font-mono">
            <div className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Severity Legend</div>
            <div className="flex items-center gap-2"><span className="text-red-400">🔴</span> Level 3 Critical ({criticalCount})</div>
            <div className="flex items-center gap-2"><span className="text-amber-400">🟡</span> Level 2 Medium ({mediumCount})</div>
            <div className="flex items-center gap-2"><span className="text-green-400">🟢</span> Level 1 Low ({lowCount})</div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW 4: VIDEO INGESTION & AI SETTINGS
      ══════════════════════════════════════════════════════════════════════ */}
      {mainView === 'upload' && (
        <div className="flex-1 flex items-center justify-center p-6 bg-[#050810] overflow-y-auto">
          <div className="max-w-xl w-full flex flex-col gap-4 bg-[#090e1a] p-6 rounded-2xl border border-white/10 shadow-2xl">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>📤</span> Video Ingestion &amp; YOLO AI Detection
              </h2>
              <p className="text-xs text-white/40 mt-1">
                Upload your road dashcam or drone video to run YOLOv8 pothole detection and auto-capture defect pictures.
              </p>
            </div>

            <div
              className={cn(
                'rounded-xl border-2 border-dashed p-6 flex flex-col items-center gap-3 transition-all cursor-pointer',
                dragOver
                  ? 'border-[#4ef2bb] bg-[#4ef2bb]/10'
                  : selectedFile
                  ? 'border-[#4ef2bb]/50 bg-[#4ef2bb]/5'
                  : 'border-white/15 bg-white/[0.02] hover:border-white/30'
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <span className="text-4xl">📁</span>
              {selectedFile ? (
                <div className="text-center">
                  <p className="text-sm font-bold text-[#4ef2bb] truncate max-w-[380px]">{selectedFile.name}</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB · Ready for AI processing
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-xs font-medium text-white/80">Drop inspection video here or click to browse</p>
                  <p className="text-[10px] text-white/30 mt-0.5">MP4, WebM, MOV, AVI · Up to 500 MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLoadSampleVideo}
                  className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/80 transition-all flex items-center gap-1.5"
                >
                  <span>🛣️</span> Load Demo Video
                </button>
                <button
                  onClick={handleAnalyzeDemoVideo}
                  disabled={isVideoAnalyzing}
                  className="py-2 px-3 rounded-xl bg-[#4ef2bb]/20 hover:bg-[#4ef2bb]/30 border border-[#4ef2bb]/40 text-xs font-bold text-[#4ef2bb] transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <span>⚡</span> Load &amp; Analyse Demo Video
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-white/80 bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/10">
                <input
                  type="checkbox"
                  id="autoSave"
                  checked={autoSaveDb}
                  onChange={(e) => setAutoSaveDb(e.target.checked)}
                  className="rounded accent-[#4ef2bb]"
                />
                <label htmlFor="autoSave" className="cursor-pointer select-none flex items-center gap-1.5 font-medium">
                  <span>💾</span>
                  <span>Store in SQLite Database (urbaneye.db)</span>
                </label>
              </div>
            </div>

            <div className="text-[11px] text-white/50 bg-white/[0.02] px-3 py-2 rounded-xl border border-white/[0.06] flex items-center justify-between">
              <span>🗄️ Target Database: <strong className="text-white">SQLite (backend/urbaneye.db)</strong></span>
              <span className={autoSaveDb ? "text-emerald-400 font-semibold" : "text-amber-300 font-semibold"}>
                {autoSaveDb ? "✓ Will Save to Database" : "⚠️ Memory Only (Not Saved)"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/[0.06] text-xs">
              <div>
                <label className="text-white/40 text-[11px] block mb-1">
                  Confidence Threshold: <strong className="text-white">{(confidenceThreshold * 100).toFixed(0)}%</strong>
                </label>
                <input
                  type="range"
                  min={0.2}
                  max={0.8}
                  step={0.05}
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                  className="w-full accent-[#4ef2bb]"
                />
              </div>

              <div>
                <label className="text-white/40 text-[11px] block mb-1">
                  Frame Sample Rate: <strong className="text-white">Every {sampleEveryN} Frames</strong>
                </label>
                <select
                  value={sampleEveryN}
                  onChange={(e) => setSampleEveryN(parseInt(e.target.value, 10))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs font-mono outline-none"
                >
                  <option value={5}>Every 5 frames (Highest Precision)</option>
                  <option value={10}>Every 10 frames (Balanced - Fast)</option>
                  <option value={20}>Every 20 frames (Super Fast)</option>
                </select>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-400"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleAnalyze}
              disabled={isVideoAnalyzing}
              className={cn(
                'rounded-xl py-3 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg',
                !isVideoAnalyzing
                  ? 'bg-[#4ef2bb] text-[#060910] hover:bg-[#3de0aa] shadow-[0_0_20px_rgba(78,242,187,0.3)]'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              )}
            >
              {isVideoAnalyzing ? (
                <>
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Processing Video Frames… {Math.round(progress)}%</span>
                </>
              ) : (
                <>
                  <span>⚡</span> Analyse Road Video with YOLO
                </>
              )}
            </button>

            <AnimatePresence>
              {isVideoAnalyzing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1.5">
                  <div className="rounded-full bg-white/10 h-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-[#4ef2bb] rounded-full"
                      style={{ width: `${progress}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                  <p className="text-[11px] text-[#4ef2bb] font-mono animate-pulse truncate text-center">
                    {processingPhase}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── High-Res Photo Lightbox Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {photoModalPothole && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPhotoModalPothole(null)}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#090e1a] border border-[#4ef2bb]/40 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📸</span>
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono">
                      POTHOLE SNAPSHOT · {photoModalPothole.detection_id}
                    </h3>
                    <p className="text-[11px] text-white/40 font-mono">
                      Timestamp: {(photoModalPothole.timestamp_sec ?? 0).toFixed(1)}s · Frame {photoModalPothole.frame_idx}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setPhotoModalPothole(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* High-Resolution Picture View */}
              <div className="relative bg-black flex items-center justify-center aspect-video max-h-[400px] overflow-hidden border-b border-white/10">
                <img
                  src={getPotholeImageUrl(photoModalPothole)}
                  alt={`Pothole ${photoModalPothole.detection_id}`}
                  className="w-full h-full object-contain"
                  onError={(e) => handleImageError(e, photoModalPothole)}
                />
                <div className="absolute top-3 left-3">
                  <SeverityBadge level={photoModalPothole.severity_level} />
                </div>
              </div>

              {/* Modal Details Footer */}
              <div className="p-5 flex flex-col gap-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white/[0.03] p-3 rounded-xl border border-white/[0.06] text-xs font-mono">
                  <div>
                    <span className="text-white/40 block text-[10px]">Confidence</span>
                    <span className="text-white font-bold">{confidencePct(photoModalPothole.confidence)}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px]">Depth Score</span>
                    <span className="text-white font-bold">{photoModalPothole.depth_score.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px]">Road Area</span>
                    <span className="text-white font-bold">{photoModalPothole.area_pct.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px]">GPS Geotag</span>
                    <span className="text-[#4ef2bb] font-bold truncate block">{formatGPS(photoModalPothole.lat, photoModalPothole.long)}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                  <strong>Action Directive:</strong> {photoModalPothole.action_required}
                </div>

                <div className="flex items-center justify-between gap-2 mt-1">
                  <button
                    onClick={() => {
                      handleDeletePothole(photoModalPothole.detection_id);
                      setPhotoModalPothole(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-xs font-bold text-red-400 transition-all flex items-center gap-1.5"
                  >
                    <span>🗑️</span> Remove from Detections
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        handleSelectPothole(photoModalPothole);
                        setPhotoModalPothole(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-all"
                    >
                      ⏱️ Seek Video
                    </button>

                    <button
                      onClick={() => downloadWorkOrderPdf(photoModalPothole.detection_id)}
                      className="px-4 py-2 rounded-xl bg-[#4ef2bb] text-[#060910] text-xs font-bold hover:bg-[#3de0aa] transition-all shadow-[0_0_15px_rgba(78,242,187,0.3)] flex items-center gap-1.5"
                    >
                      <span>📄</span> Download PWD PDF
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Notification Toast ────────────────────────────────────── */}
      <AnimatePresence>
        {deleteToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[9999] bg-[#0c1222] border border-[#4ef2bb]/50 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3"
          >
            <span className="text-xl">
              {deleteToast.id === 'db-save' ? '💾' : '🗑️'}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#4ef2bb]">
                {deleteToast.id === 'db-save' ? 'Database Sync' : 'Pothole Removed'}
              </span>
              <span className="text-xs text-white/80">{deleteToast.message}</span>
            </div>
            <button
              onClick={() => setDeleteToast(null)}
              className="text-white/40 hover:text-white ml-2 text-sm"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
