import { NextResponse } from "next/server";
import { selectProvider } from "@/lib/tryon";
import { parseImageDataUrl, rateLimit, sameOrigin } from "@/lib/server/guard";
import type { TryOnRequest } from "@/lib/tryon/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Start a virtual try-on job. The personal photograph is relayed to the configured
 * provider for this request only — MODEO's server never writes it to disk or a database.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const limited = rateLimit(req, "tryon", 10);
  if (limited) return limited;
  const body = await req.json().catch(() => null);
  if (!body?.consent) return NextResponse.json({ error: "Explicit consent is required before processing your photograph." }, { status: 400 });
  const person = parseImageDataUrl(body.personImage, 8_000_000);
  if (!person) return NextResponse.json({ error: "Personal photo missing or too large." }, { status: 400 });
  let garmentImage: string | undefined;
  if (typeof body.garmentImage === "string") {
    if (body.garmentImage.startsWith("https://")) garmentImage = body.garmentImage;
    else if (parseImageDataUrl(body.garmentImage, 6_000_000)) garmentImage = body.garmentImage;
  }
  const request: TryOnRequest = {
    personImage: body.personImage,
    garmentImage,
    garmentCategory: ["tops", "bottoms", "one-pieces"].includes(body.garmentCategory) ? body.garmentCategory : "auto",
    outfitDescription: String(body.outfitDescription ?? "").slice(0, 1200),
  };
  const { provider, reason } = selectProvider(request);
  if (!provider) {
    if (reason === "needs-garment-image") {
      return NextResponse.json({ mode: "unsupported", reason: "The configured try-on provider needs a photo of the garment. Use a look built around a photographed garment, or add REPLICATE_API_TOKEN for text-guided try-on." });
    }
    return NextResponse.json({ mode: "demo", reason: "No virtual try-on provider is configured on the server." });
  }
  try {
    const id = await provider.start(request);
    return NextResponse.json({ mode: "live", provider: provider.name, providerLabel: provider.label, jobId: `${provider.name}:${id}` });
  } catch (e) {
    console.error("[try-on] start failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "The try-on service couldn't start this job. Please try again." }, { status: 502 });
  }
}
