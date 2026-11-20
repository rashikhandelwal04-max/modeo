import "server-only";
import { createHash } from "node:crypto";
import { put } from "@vercel/blob";

/**
 * Permanent, shared image library on Vercel Blob. Every generated photo is stored once under a
 * name derived from its description + variant, and reused for every visitor afterwards.
 * Enabled automatically when the project has a Blob store connected (BLOB_READ_WRITE_TOKEN).
 */
const token = () => process.env.BLOB_READ_WRITE_TOKEN || "";
export const blobEnabled = () => !!token();

let learnedBase: string | null = null;
function baseUrl() {
  if (learnedBase) return learnedBase;
  const m = /^vercel_blob_rw_([a-z0-9]+)_/i.exec(token());
  return m ? `https://${m[1].toLowerCase()}.public.blob.vercel-storage.com` : null;
}

export function blobPath(prompt: string, seed: number) {
  return `garments/${createHash("sha256").update(prompt).digest("hex").slice(0, 32)}-${seed}.jpg`;
}

/** URL of the stored image, or null if it hasn't been generated yet. */
export async function findStored(path: string): Promise<string | null> {
  const base = baseUrl();
  if (!base) return null;
  const url = `${base}/${path}`;
  try {
    const r = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
    return r.ok ? url : null;
  } catch {
    return null;
  }
}

export async function store(path: string, dataUrl: string): Promise<string | null> {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  try {
    const res = await put(path, Buffer.from(m[2], "base64"), { access: "public", contentType: m[1], addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 31536000, token: token() });
    learnedBase = res.url.slice(0, res.url.length - path.length - 1);
    return res.url;
  } catch (e) {
    console.error("[blob] store failed:", e instanceof Error ? e.message : e);
    return null;
  }
}
