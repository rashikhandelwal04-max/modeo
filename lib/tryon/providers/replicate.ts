import "server-only";
import type { TryOnPoll, TryOnProvider, TryOnRequest } from "../types";
import { urlToDataUrl } from "../fetchImage";

/**
 * Replicate — text-guided outfit editing on the user's own photograph (default model:
 * black-forest-labs/flux-kontext-pro). Used when a look has no garment photo, so the
 * outfit is described in words. Identity preservation is instructed but not guaranteed.
 */
const BASE = "https://api.replicate.com/v1";
const token = () => process.env.REPLICATE_API_TOKEN || "";
const model = () => process.env.REPLICATE_TRYON_MODEL || "black-forest-labs/flux-kontext-pro";

export function buildPrompt(desc: string) {
  return (
    `Dress the person in this photograph in the following outfit: ${desc}. ` +
    "Change only the clothing, footwear and accessories. Keep the person's face, identity, skin tone, hair, body shape, pose, " +
    "camera angle, lighting and background exactly the same. Photorealistic fashion photograph, natural fabric drape."
  );
}

export const replicate: TryOnProvider = {
  name: "replicate",
  label: "Replicate",
  configured: () => !!token(),
  supports: () => true,
  async start(req: TryOnRequest) {
    const res = await fetch(`${BASE}/models/${model()}/predictions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { prompt: buildPrompt(req.outfitDescription), input_image: req.personImage, output_format: "jpg", aspect_ratio: "match_input_image" },
      }),
      signal: AbortSignal.timeout(30000),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; detail?: string };
    if (!res.ok || !data.id) throw new Error(`Replicate rejected the request (${res.status}) ${data.detail ?? ""}`.trim());
    return data.id;
  },
  async poll(id: string): Promise<TryOnPoll> {
    const res = await fetch(`${BASE}/predictions/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token()}` },
      signal: AbortSignal.timeout(20000),
    });
    const data = (await res.json().catch(() => ({}))) as { status?: string; output?: string | string[]; error?: string };
    if (!res.ok) return { status: "failed", error: `Replicate status error (${res.status})` };
    if (data.status === "succeeded") {
      const out = Array.isArray(data.output) ? data.output[0] : data.output;
      if (!out) return { status: "failed", error: "No image returned" };
      return { status: "completed", image: await urlToDataUrl(out) };
    }
    if (data.status === "failed" || data.status === "canceled") return { status: "failed", error: data.error || "Generation failed" };
    return { status: "processing" };
  },
};
