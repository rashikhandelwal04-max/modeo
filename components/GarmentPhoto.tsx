"use client";
import { useEffect, useState } from "react";
import { useImage } from "@/lib/store/images";
import { freeImageUrl, useGarmentImage } from "@/lib/garmentImage";
import { productPrompt } from "@/lib/stylist";
import { useApp } from "@/lib/store/state";
import { cx } from "@/lib/util";
import type { Category } from "@/lib/types";

export interface PhotoSubject {
  name: string;
  category?: Category;
  color?: string;
  colorHex?: string;
  fabric?: string;
  neckline?: string;
  fit?: string;
  silhouette?: string;
  length?: string;
  detail?: string;
  imageId?: string;
  imageUrl?: string;
}

/**
 * A garment shown as a photograph. Order: the user's own photo → a photorealistic product shot
 * from Replicate (if configured) → a photorealistic product shot from the free image service.
 */
export default function GarmentPhoto({ g, className, prompt: promptOverride }: { g: PhotoSubject; className?: string; label?: boolean; prompt?: string }) {
  const { status } = useApp();
  const own = useImage(g.imageId);
  const prompt = own || g.imageUrl ? undefined : promptOverride ?? productPrompt({ ...g, shadeHex: undefined });
  const replicate = !!status?.imageGen;
  const gen = useGarmentImage(replicate ? prompt : undefined, replicate);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const src = own ?? g.imageUrl ?? (replicate ? gen.src : prompt && status ? freeImageUrl(prompt) + (attempt ? `&r=${attempt}` : "") : null);
  useEffect(() => { setLoaded(false); setFailed(false); }, [src]);
  return (
    <div className={cx("gphoto", className, (!loaded || gen.loading) && !failed && "loading", failed && "failed")}>
      {src && !failed && <img key={src} src={src} alt={g.name} referrerPolicy="no-referrer" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />}
      {failed && (
        <div className="gphoto-fail">
          <span>{g.name}</span>
          <button type="button" className="link-btn" onClick={(e) => { e.stopPropagation(); setAttempt((a) => a + 1); }}>Retry photo</button>
        </div>
      )}
    </div>
  );
}
