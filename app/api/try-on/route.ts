import { NextResponse } from "next/server";
import { selectProvider } from "@/lib/tryon";
import { parseImageDataUrl, rateLimit, sameOrigin } from "@/lib/server/guard";
import type { TryOnRequest } from "@/lib/tryon/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Start a virtual try-on job. The personal photograph is relayed to the configured
 * provider for this request only — MY GALA's server never writes it to disk or a database.
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
    pose: typeof body.pose === "string" ? body.pose.slice(0, 60) : undefined,
  };
  const { provider, reason } = selectProvider(request);
  if (!provider) {
    if (reason === "needs-garment-image") {
      return NextResponse.json({ mode: "unsupported", reason: "The try-on service needs a garment photo, and none was available for this piece." });
    }
    return NextResponse.json({ mode: "demo", reason: "No virtual try-on provider is configured on the server." });
  }
  try {
    if ("sync" in provider && (provider as { sync?: boolean }).sync) {
      const image = await (provider as unknown as { run(r: TryOnRequest): Promise<string> }).run(request);
      return NextResponse.json({ mode: "live", provider: provider.name, providerLabel: provider.label, image });
    }
    const id = await provider.start(request);
    return NextResponse.json({ mode: "live", provider: provider.name, providerLabel: provider.label, jobId: `${provider.name}:${id}` });
  } catch (e) {
    console.error("[try-on] start failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "The try-on service couldn't start this job. Please try again." }, { status: 502 });
  }
}
