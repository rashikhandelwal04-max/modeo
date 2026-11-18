"use client";
import { useImage } from "@/lib/store/images";
import { useGarmentImage } from "@/lib/garmentImage";
import { productPrompt } from "@/lib/stylist";
import { useApp } from "@/lib/store/state";
import { hexOf } from "@/lib/colors";
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
 * A garment shown as a photograph: the user's own photo if they uploaded one, otherwise a
 * photorealistic generated product shot. If no image service is connected, a plain colour
 * card with the garment's name is shown instead — never a drawing.
 */
export default function GarmentPhoto({ g, className, label }: { g: PhotoSubject; className?: string; label?: boolean }) {
  const { status } = useApp();
  const own = useImage(g.imageId);
  const prompt = own || g.imageUrl ? undefined : productPrompt({ ...g, shadeHex: g.colorHex });
  const { src, loading } = useGarmentImage(prompt, !!status?.imageGen);
  const hex = g.colorHex ?? hexOf(g.color ?? "grey");
  const img = own ?? g.imageUrl ?? src;
  return (
    <div className={cx("gphoto", className, !img && "no-photo", loading && "loading")}>
      {img ? <img src={img} alt={g.name} referrerPolicy="no-referrer" loading="lazy" /> : (
        <div className="swatch-card">
          <span className="sw-field" style={{ background: hex }} />
          <span className="sw-name">{g.name}</span>
          {!loading && <span className="sw-note">{status?.imageGen === false ? "Photo preview needs the image service" : ""}</span>}
        </div>
      )}
      {label && img && <span className="gphoto-label">{g.name}</span>}
    </div>
  );
}
