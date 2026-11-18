"use client";
/**
 * Client side of image generation. All images come from MY GALA's own server route
 * (/api/garment-image → Replicate). Requests are queued (2 at a time) and retried after
 * Replicate's rate-limit window. Results are cached on this device per prompt + variant,
 * and "New photo" requests a fresh variant (new seed).
 */
import { useEffect, useState } from "react";
import { getImage, putImage } from "./store/images";
import { hashStr } from "./util";

export type GenState = { src: string | null; loading: boolean; error: string | null };

const VARIANTS_KEY = "mygala:imgvariants";
function variants(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(VARIANTS_KEY) || "{}"); } catch { return {}; }
}
export function variantOf(prompt: string) { return variants()[hashStr(prompt).toString(36)] ?? 0; }
function bumpVariant(prompt: string) {
  const v = variants(); const k = hashStr(prompt).toString(36); v[k] = (v[k] ?? 0) + 1;
  try { localStorage.setItem(VARIANTS_KEY, JSON.stringify(v)); } catch {}
  return v[k];
}
export const genImageId = (prompt: string, variant = variantOf(prompt)) => `gen_${hashStr(prompt).toString(36)}_${variant}`;
const seedFor = (prompt: string, variant: number) => (hashStr(prompt) + variant * 7919) % 2147483647;

// ---- small request queue (Replicate rate limits new accounts) ----
let active = 0;
const waiting: (() => void)[] = [];
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= 2) await new Promise<void>((r) => waiting.push(r));
  active++;
  try { return await fn(); } finally { active--; waiting.shift()?.(); }
}

const inflight = new Map<string, Promise<{ src: string | null; error: string | null }>>();
let notConfigured: string | null = null;

export async function getGarmentImage(prompt: string, variant = variantOf(prompt)): Promise<{ src: string | null; error: string | null }> {
  const id = genImageId(prompt, variant);
  const cached = await getImage(id);
  if (cached) return { src: cached, error: null };
  if (notConfigured) return { src: null, error: notConfigured };
  if (!inflight.has(id)) {
    inflight.set(id, slot(async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const res = await fetch("/api/garment-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, seed: seedFor(prompt, variant) }) });
          const data = await res.json().catch(() => ({}));
          if (res.status === 501 || res.status === 404) { notConfigured = data.error ?? "Image generation is not connected."; return { src: null, error: notConfigured }; }
          if (res.status === 429) { await new Promise((r) => setTimeout(r, (data.retryAfter ?? 10) * 1000)); continue; }
          if (!res.ok || !data.image) return { src: null, error: data.error ?? "The photo couldn't be generated." };
          await putImage(id, data.image);
          return { src: data.image as string, error: null };
        } catch {
          return { src: null, error: "Network error while generating the photo." };
        }
      }
      return { src: null, error: "Replicate is rate-limiting requests. Try again shortly." };
    }).finally(() => setTimeout(() => inflight.delete(id), 0)));
  }
  return inflight.get(id)!;
}

/** React hook. Generates only when `enabled` (e.g. the image is on screen). */
export function useGarmentImage(prompt: string | undefined, enabled: boolean) {
  const [variant, setVariant] = useState(() => (prompt ? variantOf(prompt) : 0));
  const [state, setState] = useState<GenState>({ src: null, loading: false, error: null });
  useEffect(() => { if (prompt) setVariant(variantOf(prompt)); }, [prompt]);
  useEffect(() => {
    let alive = true;
    if (!prompt) { setState({ src: null, loading: false, error: null }); return; }
    getImage(genImageId(prompt, variant)).then((hit) => {
      if (!alive) return;
      if (hit) return setState({ src: hit, loading: false, error: null });
      if (!enabled) return setState((s) => ({ ...s, loading: false }));
      setState({ src: null, loading: true, error: null });
      getGarmentImage(prompt, variant).then((r) => alive && setState({ src: r.src, loading: false, error: r.error }));
    });
    return () => { alive = false; };
  }, [prompt, enabled, variant]);
  const regenerate = () => { if (prompt) setVariant(bumpVariant(prompt)); };
  return { ...state, regenerate };
}
