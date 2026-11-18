import "server-only";
import { urlToDataUrl } from "./tryon/fetchImage";

/**
 * Photorealistic garment imagery via Replicate (default: black-forest-labs/flux-schnell).
 * Used for clothing the user describes but hasn't photographed, and for pairing options.
 */
const token = () => process.env.REPLICATE_API_TOKEN || "";
const model = () => process.env.MYGALA_IMAGE_MODEL || "black-forest-labs/flux-schnell";

export const imageGenConfigured = () => !!token();

const cache = new Map<string, string>();

export async function generateGarmentImage(prompt: string): Promise<string> {
  const hit = cache.get(prompt);
  if (hit) return hit;
  const res = await fetch(`https://api.replicate.com/v1/models/${model()}/predictions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", Prefer: "wait" },
    body: JSON.stringify({ input: { prompt, aspect_ratio: "3:4", output_format: "jpg", output_quality: 85, num_outputs: 1, go_fast: true } }),
    signal: AbortSignal.timeout(60000),
  });
  const data = (await res.json().catch(() => ({}))) as { output?: string | string[]; status?: string; error?: string; urls?: { get?: string } };
  if (!res.ok) throw new Error(`Image service error (${res.status}) ${data.error ?? ""}`);
  let out = Array.isArray(data.output) ? data.output[0] : data.output;
  // if the prediction didn't finish within the wait window, poll briefly
  for (let i = 0; !out && data.urls?.get && i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const p = await fetch(data.urls.get, { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json());
    if (p.status === "failed") throw new Error(p.error || "Generation failed");
    out = Array.isArray(p.output) ? p.output[0] : p.output;
  }
  if (!out) throw new Error("No image returned");
  const dataUrl = await urlToDataUrl(out);
  if (cache.size > 300) cache.clear();
  cache.set(prompt, dataUrl);
  return dataUrl;
}
