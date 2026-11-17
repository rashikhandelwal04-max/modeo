"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** Drag-to-reposition + zoom cropper with a 3:4 full-length frame. Outputs a JPEG data URL. */
export default function PhotoCropper({ src, onDone, onReplace }: { src: string; onDone: (dataUrl: string) => void; onReplace: () => void }) {
  const frame = useRef<HTMLDivElement>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [fw, setFw] = useState(300);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setNat({ w: img.naturalWidth, h: img.naturalHeight });
      setZoom(1);
      setPos({ x: 0, y: 0 });
    };
    img.src = src;
  }, [src]);

  useEffect(() => {
    if (!frame.current) return;
    const ro = new ResizeObserver(([e]) => setFw(e.contentRect.width));
    ro.observe(frame.current);
    return () => ro.disconnect();
  }, []);

  const fh = (fw * 4) / 3;
  const base = nat ? Math.max(fw / nat.w, fh / nat.h) : 1;
  const s = base * zoom;

  const clamp = useCallback(
    (p: { x: number; y: number }, sc = s) => {
      if (!nat) return p;
      const mx = Math.max(0, (nat.w * sc - fw) / 2);
      const my = Math.max(0, (nat.h * sc - fh) / 2);
      return { x: Math.max(-mx, Math.min(mx, p.x)), y: Math.max(-my, Math.min(my, p.y)) };
    },
    [nat, fw, fh, s],
  );

  useEffect(() => setPos((p) => clamp(p)), [zoom, fw, clamp]);

  const onDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setPos(clamp({ x: drag.current.px + e.clientX - drag.current.x, y: drag.current.py + e.clientY - drag.current.y }));
  };
  const onUp = () => (drag.current = null);

  const confirm = () => {
    if (!nat || !imgRef.current) return;
    const OW = 960, OH = 1280;
    const k = OW / fw;
    const c = document.createElement("canvas");
    c.width = OW;
    c.height = OH;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, OW, OH);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imgRef.current, (fw / 2 + pos.x - (nat.w * s) / 2) * k, (fh / 2 + pos.y - (nat.h * s) / 2) * k, nat.w * s * k, nat.h * s * k);
    onDone(c.toDataURL("image/jpeg", 0.9));
  };

  return (
    <div className="stack">
      <div
        ref={frame}
        className="cropper"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={(e) => setZoom((z) => Math.max(1, Math.min(3, z - e.deltaY * 0.0015)))}
        aria-label="Drag to reposition your photo"
      >
        {nat && (
          <img
            src={src}
            alt="Your photograph"
            style={{ width: nat.w, height: nat.h, transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${s})` }}
            draggable={false}
          />
        )}
        <div className="guide" />
        <div className="silhouette" />
      </div>
      <label className="field">
        <span>Zoom</span>
        <input className="range" type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(+e.target.value)} />
      </label>
      <p className="tiny muted" style={{ margin: 0 }}>Drag to reposition. Line yourself up with the dashed guide, head to toe.</p>
      <div className="row">
        <button className="btn" onClick={confirm}>Use this crop</button>
        <button className="btn ghost" onClick={onReplace}>Replace photo</button>
      </div>
    </div>
  );
}
