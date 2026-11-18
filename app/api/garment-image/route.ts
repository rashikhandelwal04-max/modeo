import { NextResponse } from "next/server";
import { generateGarmentImage, imageGenConfigured, ImageGenError } from "@/lib/imagegen";
import { rateLimit, sameOrigin } from "@/lib/server/guard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!imageGenConfigured()) return NextResponse.json({ configured: false, error: "Image generation is not connected: REPLICATE_API_TOKEN is not set on the server." }, { status: 501 });
  const limited = rateLimit(req, "garment-image", 120);
  if (limited) return limited;
  const body = await req.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.slice(0, 900) : "";
  const seed = Number.isInteger(body?.seed) ? Math.abs(body.seed) % 2147483647 : Math.floor(Math.random() * 1e9);
  if (!prompt) return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  const t0 = Date.now();
  try {
    const r = await generateGarmentImage(prompt, seed);
    console.log(`[garment-image] ${r.cached ? "cache-hit" : "generated"} prediction=${r.predictionId ?? "-"} seed=${seed} ms=${Date.now() - t0} prompt="${prompt.slice(0, 80)}…"`);
    return NextResponse.json({ image: r.image, seed, predictionId: r.predictionId, cached: r.cached, provider: "replicate" });
  } catch (e) {
    const err = e instanceof ImageGenError ? e : new ImageGenError(e instanceof Error ? e.message : "Unknown error", 502);
    console.error(`[garment-image] FAILED status=${err.status} ${err.message}`);
    return NextResponse.json({ error: err.message, retryAfter: err.retryAfter }, { status: err.status, headers: err.retryAfter ? { "Retry-After": String(err.retryAfter) } : undefined });
  }
}
