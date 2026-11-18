"use client";
import { useEffect, useState } from "react";
import { getImage, putImage } from "./store/images";
import { hashStr } from "./util";

const inflight = new Map<string, Promise<string | null>>();
let disabled = false;

export const genImageId = (prompt: string) => "gen_" + hashStr(prompt).toString(36);

/** Fetch (or reuse a cached) photorealistic product image for a prompt. */
export async function getGarmentImage(prompt: string): Promise<string | null> {
  const id = genImageId(prompt);
  const cached = await getImage(id);
  if (cached) return cached;
  if (disabled) return null;
  if (!inflight.has(id)) {
    inflight.set(id, (async () => {
      try {
        const res = await fetch("/api/garment-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
        if (res.status === 501 || res.status === 404) { disabled = true; return null; }
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.image) return null;
        await putImage(id, data.image);
        return data.image as string;
      } catch {
        return null;
      } finally {
        setTimeout(() => inflight.delete(id), 0);
      }
    })());
  }
  return inflight.get(id)!;
}

/** React hook: returns the image (or null when unavailable) and loading state. */
export function useGarmentImage(prompt: string | undefined, enabled: boolean) {
  const [state, setState] = useState<{ src: string | null; loading: boolean }>({ src: null, loading: !!prompt && enabled });
  useEffect(() => {
    let alive = true;
    if (!prompt) { setState({ src: null, loading: false }); return; }
    getImage(genImageId(prompt)).then((hit) => {
      if (!alive) return;
      if (hit) return setState({ src: hit, loading: false });
      if (!enabled) return setState({ src: null, loading: false });
      setState({ src: null, loading: true });
      getGarmentImage(prompt).then((src) => alive && setState({ src, loading: false }));
    });
    return () => { alive = false; };
  }, [prompt, enabled]);
  return state;
}
