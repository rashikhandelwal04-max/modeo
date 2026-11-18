import { NextResponse } from "next/server";
import { generateGarmentImage, imageGenConfigured } from "@/lib/imagegen";
import { rateLimit, sameOrigin } from "@/lib/server/guard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!imageGenConfigured()) return NextResponse.json({ configured: false, error: "Photo generation needs REPLICATE_API_TOKEN on the server." }, { status: 501 });
  const limited = rateLimit(req, "garment-image", 80);
  if (limited) return limited;
  const body = await req.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.slice(0, 900) : "";
  if (!prompt) return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  try {
    return NextResponse.json({ image: await generateGarmentImage(prompt) });
  } catch (e) {
    console.error("[garment-image]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Couldn't create the photo." }, { status: 502 });
  }
}
