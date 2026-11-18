import "server-only";
import { urlToDataUrl } from "./tryon/fetchImage";

/**
 * Photorealistic image generation via Replicate (default model: black-forest-labs/flux-schnell).
 * The ONLY image-generation provider in MY GALA. Requires REPLICATE_API_TOKEN with billing enabled.
 */
const token = () => process.env.REPLICATE_API_TOKEN || "";
const model = () => process.env.MYGALA_IMAGE_MODEL || "black-forest-labs/flux-schnell";

export const imageGenConfigured = () => !!token();

export class ImageGenError extends Error {
  constructor(message: string, public status: number, public retryAfter?: number) { super(message); }
}

const cache = new Map<string, string>();

export async function generateGarmentImage(prompt: string, seed: number): Promise<{ image: string; predictionId?: string; cached: boolean }> {
  const key = `${seed}|${prompt}`;
  const hit = cache.get(key);
  if (hit) return { image: hit, cached: true };
  const res = await fetch(`${process.env.REPLICATE_API_BASE || "https://api.replicate.com"}/v1/models/${model()}/predictions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", Prefer: "wait=50" },
    body: JSON.stringify({ input: { prompt, seed, aspect_ratio: "3:4", output_format: "jpg", output_quality: 85, num_outputs: 1, go_fast: true } }),
    signal: AbortSignal.timeout(58000),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; output?: string | string[]; status?: string; error?: string; detail?: string; urls?: { get?: string } };
  if (res.status === 401) throw new ImageGenError("Replicate rejected the API token (check REPLICATE_API_TOKEN).", 401);
  if (res.status === 402) throw new ImageGenError("Replicate needs billing set up on your account (Account → Billing).", 402);
  if (res.status === 429) throw new ImageGenError("Replicate rate limit reached.", 429, Number(res.headers.get("retry-after")) || 10);
  if (!res.ok) throw new ImageGenError(`Replicate error ${res.status}: ${data.detail ?? data.error ?? "unknown"}`, 502);
  let out = Array.isArray(data.output) ? data.output[0] : data.output;
  for (let i = 0; !out && data.urls?.get && i < 25; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const p = await fetch(data.urls.get, { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json());
    if (p.status === "failed" || p.status === "canceled") throw new ImageGenError(`Generation failed: ${p.error ?? p.status}`, 502);
    out = Array.isArray(p.output) ? p.output[0] : p.output;
  }
  if (!out) throw new ImageGenError("Replicate returned no image in time.", 504);
  const image = await urlToDataUrl(out);
  if (cache.size > 200) cache.clear();
  cache.set(key, image);
  return { image, predictionId: data.id, cached: false };
}
