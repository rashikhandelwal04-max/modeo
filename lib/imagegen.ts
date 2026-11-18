import "server-only";
import { urlToDataUrl } from "./tryon/fetchImage";

/**
 * Photorealistic image generation. Two providers, chosen by which keys are set:
 *  1. Replicate (paid)            — REPLICATE_API_TOKEN, model black-forest-labs/flux-schnell
 *  2. Cloudflare Workers AI (free daily allowance) — CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN,
 *     model @cf/black-forest-labs/flux-1-schnell
 */
const token = () => process.env.REPLICATE_API_TOKEN || "";
const model = () => process.env.MYGALA_IMAGE_MODEL || "black-forest-labs/flux-schnell";
const cfAccount = () => (process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
const cfToken = () => (process.env.CLOUDFLARE_API_TOKEN || "").trim();

export const imageProvider = (): "replicate" | "cloudflare" | null => (token() ? "replicate" : cfAccount() && cfToken() ? "cloudflare" : null);
export const imageGenConfigured = () => imageProvider() !== null;

export class ImageGenError extends Error {
  constructor(message: string, public status: number, public retryAfter?: number) { super(message); }
}

const cache = new Map<string, string>();

export async function generateGarmentImage(prompt: string, seed: number): Promise<{ image: string; predictionId?: string; cached: boolean; provider: string }> {
  const key = `${seed}|${prompt}`;
  const hit = cache.get(key);
  if (hit) return { image: hit, cached: true, provider: imageProvider() ?? "" };
  if (imageProvider() === "cloudflare") {
    const image = await cloudflare(prompt, seed);
    if (cache.size > 200) cache.clear();
    cache.set(key, image);
    return { image, cached: false, provider: "cloudflare" };
  }
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
  return { image, predictionId: data.id, cached: false, provider: "replicate" };
}

async function cloudflare(prompt: string, seed: number): Promise<string> {
  const base = process.env.CLOUDFLARE_API_BASE || "https://api.cloudflare.com";
  const res = await fetch(`${base}/client/v4/accounts/${encodeURIComponent(cfAccount())}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: prompt.slice(0, 2000), steps: 6, seed }),
    signal: AbortSignal.timeout(55000),
  });
  const data = (await res.json().catch(() => ({}))) as { success?: boolean; result?: { image?: string }; errors?: { code?: number; message?: string }[] };
  const msg = data.errors?.map((e) => `${e.code ?? ""} ${e.message ?? ""}`.trim()).join("; ") || "";
  if (res.status === 401 || res.status === 403 || /authentication|unauthorized|10000/i.test(msg)) throw new ImageGenError("Cloudflare rejected the token or account ID (check CLOUDFLARE_API_TOKEN has Workers AI permission and CLOUDFLARE_ACCOUNT_ID is correct).", 401);
  if (/4006|daily free allocation|neurons/i.test(msg)) throw new ImageGenError("Today's free Cloudflare image allowance is used up. It resets daily (00:00 UTC).", 429, 3600);
  if (res.status === 429) throw new ImageGenError("Cloudflare rate limit reached.", 429, Number(res.headers.get("retry-after")) || 10);
  if (!res.ok || !data.success || !data.result?.image) throw new ImageGenError(`Cloudflare error ${res.status}${msg ? `: ${msg}` : ""}`, 502);
  return `data:image/jpeg;base64,${data.result.image}`;
}
