import { NextResponse } from "next/server";
import { analyzeGarmentImage, claudeConfigured } from "@/lib/ai/claude";
import { hexOf } from "@/lib/colors";
import { parseImageDataUrl, rateLimit, sameOrigin } from "@/lib/server/guard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Garment recognition. The image is forwarded to the vision model for this single request
 * and is not stored by MODEO.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!claudeConfigured()) {
    return NextResponse.json({ configured: false, error: "Garment recognition needs ANTHROPIC_API_KEY on the server." }, { status: 501 });
  }
  const limited = rateLimit(req, "analyze", 40);
  if (limited) return limited;
  const body = await req.json().catch(() => null);
  const img = parseImageDataUrl(body?.image, 5_000_000);
  if (!img) return NextResponse.json({ error: "Send a JPEG, PNG or WebP image under 5 MB." }, { status: 400 });
  try {
    const a = await analyzeGarmentImage(img.base64, img.mediaType);
    if (!a.is_garment) return NextResponse.json({ configured: true, isGarment: false, error: "That doesn't look like a garment or accessory." }, { status: 422 });
    const clean = (s: string) => (s && s.trim() ? s.trim().toLowerCase() : undefined);
    return NextResponse.json({
      configured: true,
      isGarment: true,
      attributes: {
        name: a.name,
        category: a.category,
        color: a.color,
        colorHex: hexOf(a.color),
        fabric: clean(a.fabric),
        fit: clean(a.fit),
        silhouette: a.silhouette?.trim() || undefined,
        length: clean(a.length),
        pattern: clean(a.pattern),
        detail: clean(a.detail),
        occasion: a.occasion.map((o) => o.toLowerCase()),
        season: a.season,
        style: a.style.map((o) => o.toLowerCase()),
      },
    });
  } catch (e) {
    console.error("[analyze] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ configured: true, error: "Garment recognition failed. You can set the attributes manually." }, { status: 502 });
  }
}
