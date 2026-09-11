import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, ShieldCheck, Volume2, VolumeX, Sparkles, Navigation } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { playTacticalPing, speakDriverWarning } from '../../lib/audioAlerts';
import type { Alert } from '../../types';

interface LiveDashcamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LiveDashcamModal({ isOpen, onClose }: LiveDashcamModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [isScanning] = useState(true);
  const [lastDetected, setLastDetected] = useState<{ type: string; conf: number; time: string } | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const { alerts, setAlerts, setSelectedAlertId } = useAppStore();

  // Start webcam
  const startCamera = async () => {
    setCamError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn('[Dashcam] Camera access error:', err);
      setCamError(err.message || 'Camera permission denied or camera not found.');
      setCameraActive(false);
    }
  };

  // Stop webcam
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Capture current frame and transmit real defect alert
  const triggerManualDetection = () => {
    playTacticalPing(950, 0.22);
    if (audioEnabled) {
      speakDriverWarning('Hawk AI alert: Severe road pothole detected. Telemetry pushed to municipal network.');
    }

    let captureBase64 = '';
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Draw red AI bounding box on the captured frame
        const bx = Math.round(canvas.width * 0.35);
        const by = Math.round(canvas.height * 0.55);
        const bw = Math.round(canvas.width * 0.30);
        const bh = Math.round(canvas.height * 0.25);

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.strokeRect(bx, by, bw, bh);

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(bx, by - 26, 160, 26);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('POTHOLE: 91%', bx + 6, by - 8);

        captureBase64 = canvas.toDataURL('image/jpeg', 0.85);
      }
    }

    const now = new Date();
    const alertId = `ALT-CAM-${Math.floor(1000 + Math.random() * 9000)}`;

    const newAlert: Alert = {
      id: alertId,
      type: 'pothole',
      confidence: 0.91,
      lat: 28.6315 + (Math.random() - 0.5) * 0.015,
      long: 77.2167 + (Math.random() - 0.5) * 0.015,
      timestamp: now.toISOString(),
      bus_id: 'BUS-042',
      status: 'open',
      meta: {
        image_url: captureBase64 || undefined,
        verified_by_bus_count: 1,
        severity_level: 3,
        severity_label: 'Critical',
        action_required: 'Immediate cold-mix compaction',
        area_pct: 5.8,
        depth_score: 0.84,
        source: 'live_camera',
      },
    };

    // Prepend to alerts list so map and list immediately update
    setAlerts([newAlert, ...alerts]);
    setSelectedAlertId(newAlert.id);

    setLastDetected({
      type: 'POTHOLE',
      conf: 91,
      time: now.toLocaleTimeString(),
    });

    // Optionally post to backend
    fetch('http://localhost:8000/alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'bel_sih_edge_secret_token_2026',
      },
      body: JSON.stringify(newAlert),
    }).catch(() => {});
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl bg-slate-950 border border-amber-500/40 rounded-2xl overflow-hidden shadow-2xl shadow-amber-500/10 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/90 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                  HAWK AI • LIVE BUS DASHCAM
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    EDGE SENSING
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  VEHICLE: BUS-042 • FRONT-DASH 1080P • AI MODEL: YOLOV8-ONNX
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`p-2 rounded-lg border transition-colors ${
                  audioEnabled
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-white/5 text-slate-400 border-white/10'
                }`}
                title={audioEnabled ? 'Voice Warning: Enabled' : 'Voice Warning: Muted'}
              >
                {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors border border-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Video Stream & HUD */}
          <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Error or No Camera Fallback */}
            {camError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-center p-6 z-20">
                <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
                <h4 className="text-base font-semibold text-white mb-1">Camera Feed Offline</h4>
                <p className="text-xs text-slate-400 max-w-md mb-4">{camError}</p>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-xs transition"
                >
                  Retry Camera Access
                </button>
              </div>
            )}

            {/* Tactical HUD Overlay */}
            {cameraActive && (
              <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                {/* Top Telemetry */}
                <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300 drop-shadow-md">
                  <div className="flex items-center gap-2 bg-black/60 px-2.5 py-1 rounded border border-cyan-500/30">
                    <Navigation className="w-3 h-3 text-cyan-400 animate-spin" />
                    <span>GPS: 28.6315°N, 77.2167°E</span>
                    <span className="text-slate-400">|</span>
                    <span>SPEED: 42.4 KM/H</span>
                  </div>
                  <div className="bg-black/60 px-2.5 py-1 rounded border border-cyan-500/30">
                    <span>FRAME RATE: 30.0 FPS</span>
                  </div>
                </div>

                {/* Center AI Target Reticle & Scanline */}
                {isScanning && (
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse opacity-70" />
                )}

                <div className="relative mx-auto w-64 h-36 border border-cyan-500/40 rounded-lg flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="absolute -top-5 left-1 text-[10px] font-mono text-cyan-400">
                    ROAD ROI REGION [640x640]
                  </span>
                </div>

                {/* Bottom Status Banner */}
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>EDGE INFERENCE: ACTIVE</span>
                  </div>

                  {lastDetected && (
                    <div className="bg-red-500/20 text-red-300 border border-red-500/40 px-3 py-1.5 rounded-lg animate-bounce">
                      🚨 DEFECT LOGGED: {lastDetected.type} ({lastDetected.conf}%) at {lastDetected.time}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="p-4 bg-slate-900 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Simulates real bus-mounted dashcam with automatic live defect ledgering.</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={triggerManualDetection}
                disabled={!cameraActive}
                className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/25 flex items-center gap-2 cursor-pointer transition transform active:scale-95"
              >
                <AlertTriangle className="w-4 h-4" />
                Trigger AI Pothole Detection
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
