import "server-only";
import { Client, handle_file } from "@gradio/client";
import type { TryOnPoll, TryOnProvider, TryOnRequest } from "../types";
import { urlToDataUrl } from "../fetchImage";

/**
 * Hugging Face — the open-source IDM-VTON virtual try-on model (yisol/IDM-VTON Space).
 * Free with a Hugging Face access token (HF_TOKEN), within the Space's GPU quota.
 * Takes the person photo + a garment photo. Best for tops/upper-body garments.
 */
const token = () => process.env.HF_TOKEN || "";
const space = () => process.env.HF_TRYON_SPACE || "yisol/IDM-VTON";

function toBlob(dataUrl: string) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return dataUrl; // https URL
  return new Blob([Buffer.from(m[2], "base64")], { type: m[1] });
}

export const huggingface: TryOnProvider & { sync: true; run(req: TryOnRequest): Promise<string> } = {
  name: "huggingface" as never,
  label: "IDM-VTON (Hugging Face)",
  sync: true,
  configured: () => !!token(),
  supports: (req) => !!req.garmentImage,
  async start() {
    throw new Error("sync provider");
  },
  async poll(): Promise<TryOnPoll> {
    return { status: "failed", error: "sync provider" };
  },
  async run(req: TryOnRequest) {
    const app = await Client.connect(space(), { hf_token: token() as `hf_${string}` });
    const result = await app.predict("/tryon", [
      { background: handle_file(toBlob(req.personImage)), layers: [], composite: null },
      handle_file(toBlob(req.garmentImage!)),
      req.outfitDescription.slice(0, 200) || "garment",
      true, // auto-mask
      true, // auto-crop & resize
      30, // denoising steps
      42, // seed
    ]);
    const data = result.data as { url?: string; path?: string }[];
    const url = data?.[0]?.url;
    if (!url) throw new Error("The try-on model returned no image");
    return urlToDataUrl(url);
  },
};
