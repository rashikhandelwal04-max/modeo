import { NextResponse } from "next/server";
import { claudeConfigured, styleWithClaude, type StyleRequest } from "@/lib/ai/claude";
import { generateLooks } from "@/lib/styling/engine";
import { rateLimit, sameOrigin } from "@/lib/server/guard";
import { ALL_CATEGORIES } from "@/lib/taxonomy";
import type { Season } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const limited = rateLimit(req, "style", 30);
  if (limited) return limited;
  let body: StyleRequest & { seed?: number; preferRules?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body?.anchor || !ALL_CATEGORIES.includes(body.anchor.category)) {
    return NextResponse.json({ error: "A garment with a valid category is required." }, { status: 400 });
  }
  // never accept image payloads here — styling works on attributes only
  const strip = <T extends { imageUrl?: string }>(g: T) => g;
  const anchor = strip({ ...body.anchor });
  const wardrobe = (body.wardrobe ?? []).slice(0, 200);

  let notice: string | undefined;
  if (claudeConfigured() && !body.preferRules) {
    try {
      const looks = await styleWithClaude({ ...body, anchor, wardrobe });
      return NextResponse.json({ looks, engine: "claude" });
    } catch (e) {
      console.error("[style] Claude failed, falling back to rules:", e instanceof Error ? e.message : e);
      notice = "AI stylist unavailable just now — showing MODEO's offline rule-based styling.";
    }
  }
  const looks = generateLooks({
    anchor,
    anchorOwned: body.anchorOwned,
    nudges: body.nudges,
    wardrobe,
    mode: body.mode,
    profile: body.profile,
    occasion: body.occasion,
    season: body.season as Season | undefined,
    seed: body.seed,
  });
  return NextResponse.json({ looks, engine: "rules", notice });
}
