import "server-only";
import type { TryOnPoll, TryOnProvider, TryOnRequest } from "../types";
import { urlToDataUrl } from "../fetchImage";

/**
 * FASHN virtual try-on (https://docs.fashn.ai). Garment-image based: needs a photo of the
 * garment. Preserves the person's identity/pose as far as the model allows.
 */
const BASE = "https://api.fashn.ai/v1";
const key = () => process.env.FASHN_API_KEY || "";

export const fashn: TryOnProvider = {
  name: "fashn",
  label: "FASHN",
  configured: () => !!key(),
  supports: (req) => !!req.garmentImage,
  async start(req: TryOnRequest) {
    const res = await fetch(`${BASE}/run`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model_name: process.env.FASHN_MODEL || "tryon-v1.6",
        inputs: {
          model_image: req.personImage,
          garment_image: req.garmentImage,
          category: req.garmentCategory ?? "auto",
          mode: "quality",
          output_format: "png",
        },
      }),
      signal: AbortSignal.timeout(30000),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; error?: unknown };
    if (!res.ok || !data.id) throw new Error(`FASHN rejected the request (${res.status}) ${data.error ? JSON.stringify(data.error) : ""}`.trim());
    return data.id;
  },
  async poll(id: string): Promise<TryOnPoll> {
    const res = await fetch(`${BASE}/status/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key()}` },
      signal: AbortSignal.timeout(20000),
    });
    const data = (await res.json().catch(() => ({}))) as { status?: string; output?: string[]; error?: { message?: string } | string | null };
    if (!res.ok) return { status: "failed", error: `FASHN status error (${res.status})` };
    if (data.status === "completed" && data.output?.[0]) return { status: "completed", image: await urlToDataUrl(data.output[0]) };
    if (data.status === "failed" || data.status === "canceled") {
      return { status: "failed", error: typeof data.error === "string" ? data.error : data.error?.message || "Generation failed" };
    }
    return { status: "processing" };
  },
};
