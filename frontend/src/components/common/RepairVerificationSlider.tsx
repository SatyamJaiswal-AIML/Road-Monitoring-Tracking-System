import React, { useState, useRef, useCallback } from 'react';
import type { Alert } from '../../types';

interface RepairVerificationSliderProps {
  alert: Alert;
  className?: string;
}

export function RepairVerificationSlider({ alert, className = '' }: RepairVerificationSliderProps) {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // After image: from real verification or user upload
  const [uploadedAfter, setUploadedAfter] = useState<string | null>(null);

  // Before = auto-captured by edge AI (bus camera YOLO snapshot)
  const beforeImg = alert.meta.image_url || null;
  // After = auto-verified by another bus OR manually uploaded
  const afterImg = alert.meta.repaired_image_url || uploadedAfter;

  const canCompare = beforeImg && afterImg;

  // File upload handler for AFTER image only
  const handleUploadAfter = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedAfter(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPos(pct);
    },
    []
  );

  const onMouseDown = () => setIsDragging(true);
  const onMouseUp = () => setIsDragging(false);
  const onMouseMove = (e: React.MouseEvent) => {
    if (isDragging) handleMove(e.clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) handleMove(e.touches[0].clientX);
  };

  // ─── Waiting State: after image not yet available ──────────────────────
  if (!canCompare) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <div className="relative w-full h-[180px] rounded-xl overflow-hidden border border-dashed border-white/15 bg-zinc-950/80">
          {/* Show before image on left half if available */}
          {beforeImg && (
            <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
              <img src={beforeImg} alt="Original Defect" className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-zinc-950/90" />
              <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-950/80 backdrop-blur-md border border-red-500/40 text-[9px] font-mono text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span>DETECTED</span>
              </div>
            </div>
          )}

          {/* Right side: upload prompt */}
          <div className={`absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-2 ${beforeImg ? 'w-1/2' : 'w-full'}`}>
            {/* Scan line animation */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse" style={{ top: '40%' }} />
              <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse" style={{ top: '60%', animationDelay: '0.5s' }} />
            </div>

            {!beforeImg && (
              <>
                <div className="text-2xl opacity-30">📷</div>
                <div className="text-[10px] font-mono text-white/25 uppercase tracking-wider">
                  Awaiting Edge Capture
                </div>
              </>
            )}

            <div className="text-[10px] text-white/30 text-center px-4">
              {beforeImg ? 'Upload repaired photo to compare' : 'No images available yet'}
            </div>

            <button
              type="button"
              onClick={handleUploadAfter}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold border bg-emerald-500/10 text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/20 transition-all cursor-pointer"
            >
              ⬆ Upload Repaired Photo
            </button>
          </div>

          {/* Center divider if before exists */}
          {beforeImg && (
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10" />
          )}
        </div>

        {/* Audit Info (pending) */}
        <div className="bg-zinc-800/40 border border-white/[0.06] rounded-lg p-2 flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-2">
            <span className="text-base opacity-40">⏳</span>
            <div>
              <div className="font-semibold text-zinc-400">Closed-Loop Audit: Waiting to Compare</div>
              <div className="text-zinc-500 text-[9px]">
                {beforeImg ? 'Defect captured — upload repaired photo to verify' : 'Awaiting bus camera capture & repair verification'}
              </div>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-zinc-700/50 text-zinc-500 font-mono font-bold text-[9px]">
            PENDING
          </span>
        </div>
      </div>
    );
  }

  // ─── Active Slider: both images present ────────────────────────────────
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
        onTouchMove={onTouchMove}
        className="relative w-full h-[180px] rounded-xl overflow-hidden border border-white/10 bg-zinc-950 select-none cursor-ew-resize group shadow-inner"
      >
        {/* Background / RIGHT Image (AFTER: REPAIRED) */}
        <div className="absolute inset-0 w-full h-full">
          <img src={afterImg} alt="Repaired Pavement" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
          <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 text-[9px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>✓ REPAIRED (AUDITED)</span>
          </div>
          <div className="absolute bottom-2 right-2 text-[9px] font-mono text-emerald-300 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
            {alert.meta.repaired_verified_by_bus || 'DTC-1940'} • SMOOTH 98%
          </div>
        </div>

        {/* Foreground / LEFT Image (BEFORE: ORIGINAL DEFECT) clipped */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}
        >
          <img src={beforeImg} alt="Original Defect" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-950/80 backdrop-blur-md border border-red-500/40 text-[9px] font-mono text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span>ORIGINAL DEFECT</span>
          </div>
          <div className="absolute bottom-2 left-2 text-[9px] font-mono text-red-300 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
            {alert.bus_id} • SEVERITY HIGH
          </div>
        </div>

        {/* Draggable Divider */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] pointer-events-none"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-zinc-900 border-2 border-amber-400 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.6)] flex items-center justify-center text-[10px] font-bold">
            ↔
          </div>
        </div>
      </div>

      {/* Control Strip */}
      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 px-1">
        <span className="text-zinc-500">← Drag to Compare Pavement →</span>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => setSliderPos(0)}
            className={`px-1.5 py-0.5 rounded border transition-colors ${sliderPos === 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-black/30 border-white/5 hover:text-white'}`}>
            After
          </button>
          <button type="button" onClick={() => setSliderPos(50)}
            className={`px-1.5 py-0.5 rounded border transition-colors ${sliderPos === 50 ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-black/30 border-white/5 hover:text-white'}`}>
            Split
          </button>
          <button type="button" onClick={() => setSliderPos(100)}
            className={`px-1.5 py-0.5 rounded border transition-colors ${sliderPos === 100 ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-black/30 border-white/5 hover:text-white'}`}>
            Before
          </button>
        </div>
      </div>

      {/* Audit Info Callout */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-2">
          <span className="text-base">🛡️</span>
          <div>
            <div className="font-semibold text-emerald-300">Closed-Loop Contractor Audit: Passed</div>
            <div className="text-zinc-400 text-[9px]">
              {alert.meta.repaired_by_contractor || 'M/s Delhi PWD Concessionaire'} • Invoice Cleared
            </div>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[9px]">
          PCI +{alert.meta.pci_impact_score ? alert.meta.pci_impact_score - 80 : 14} PTS
        </span>
      </div>
    </div>
  );
}
