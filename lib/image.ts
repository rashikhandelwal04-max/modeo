"use client";
import { nearestColor, rgbToHex } from "./colors";

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = src;
  });
}

/** Downscale to keep storage and API payloads small. Returns a JPEG data URL. */
export async function resizeDataUrl(src: string, maxDim = 1280, quality = 0.88): Promise<string> {
  const img = await loadImage(src);
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return c.toDataURL("image/jpeg", quality);
}

/**
 * Estimate a garment's dominant colour from a photo. Samples the central region,
 * discards pixels that resemble the background (sampled from the borders), then
 * takes the largest colour bucket. Runs entirely in the browser.
 */
export async function dominantColor(src: string): Promise<{ hex: string; name: string }> {
  const img = await loadImage(src);
  const S = 64;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, S, S);
  const { data } = ctx.getImageData(0, 0, S, S);
  const px = (x: number, y: number) => {
    const i = (y * S + x) * 4;
    return [data[i], data[i + 1], data[i + 2]] as [number, number, number];
  };
  // background estimate from the border
  const border: [number, number, number][] = [];
  for (let i = 0; i < S; i++) border.push(px(i, 0), px(i, S - 1), px(0, i), px(S - 1, i));
  const bg = border.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]).map((v) => v / border.length);
  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let y = Math.floor(S * 0.15); y < S * 0.85; y++) {
    for (let x = Math.floor(S * 0.2); x < S * 0.8; x++) {
      const [r, g, b] = px(x, y);
      const dbg = Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]);
      if (dbg < 40) continue;
      const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
      const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      e.n++; e.r += r; e.g += g; e.b += b;
      buckets.set(key, e);
    }
  }
  let best = { n: 0, r: 128, g: 128, b: 128 };
  buckets.forEach((v) => { if (v.n > best.n) best = v; });
  const hex = best.n ? rgbToHex(best.r / best.n, best.g / best.n, best.b / best.n) : rgbToHex(bg[0], bg[1], bg[2]);
  return { hex, name: nearestColor(hex).name };
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
