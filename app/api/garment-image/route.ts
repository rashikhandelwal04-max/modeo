import { NextResponse } from "next/server";
import { generateGarmentImage, imageGenConfigured, ImageGenError } from "@/lib/imagegen";
import { rateLimit, sameOrigin } from "@/lib/server/guard";
import { blobEnabled, blobPath, findStored, store } from "@/lib/blobcache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!imageGenConfigured()) return NextResponse.json({ configured: false, error: "Image generation is not connected: set CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (free) or REPLICATE_API_TOKEN on the server." }, { status: 501 });
  const limited = rateLimit(req, "garment-image", 120);
  if (limited) return limited;
  const body = await req.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.slice(0, 900) : "";
  const seed = Number.isInteger(body?.seed) ? Math.abs(body.seed) % 2147483647 : Math.floor(Math.random() * 1e9);
  if (!prompt) return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  const t0 = Date.now();
  // 1. shared library: already generated once (by anyone)? reuse it — costs nothing
  const path = blobPath(prompt, seed);
  if (blobEnabled()) {
    const url = await findStored(path);
    if (url) {
      console.log(`[garment-image] library-hit seed=${seed} ms=${Date.now() - t0}`);
      return NextResponse.json({ image: url, seed, cached: true, provider: "library" });
    }
  }
  try {
    const r = await generateGarmentImage(prompt, seed);
    // 2. save new images to the shared library so nobody pays for them again
    if (!r.cached && blobEnabled()) {
      const url = await store(path, r.image);
      if (url) {
        console.log(`[garment-image] ${r.provider} generated+stored seed=${seed} ms=${Date.now() - t0}`);
        return NextResponse.json({ image: url, seed, cached: false, provider: r.provider });
      }
    }
    console.log(`[garment-image] ${r.provider} ${r.cached ? "cache-hit" : "generated"} prediction=${r.predictionId ?? "-"} seed=${seed} ms=${Date.now() - t0} prompt="${prompt.slice(0, 80)}…"`);
    return NextResponse.json({ image: r.image, seed, predictionId: r.predictionId, cached: r.cached, provider: r.provider });
  } catch (e) {
    const err = e instanceof ImageGenError ? e : new ImageGenError(e instanceof Error ? e.message : "Unknown error", 502);
    console.error(`[garment-image] FAILED status=${err.status} ${err.message}`);
    return NextResponse.json({ error: err.message, retryAfter: err.retryAfter }, { status: err.status, headers: err.retryAfter ? { "Retry-After": String(err.retryAfter) } : undefined });
  }
}
