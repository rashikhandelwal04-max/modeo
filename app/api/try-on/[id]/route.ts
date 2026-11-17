import { NextResponse } from "next/server";
import { providerByName } from "@/lib/tryon";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = /^(fashn|replicate):([A-Za-z0-9_-]{4,80})$/.exec(id);
  if (!m) return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
  const provider = providerByName(m[1]);
  if (!provider?.configured()) return NextResponse.json({ error: "Provider not configured" }, { status: 400 });
  try {
    return NextResponse.json(await provider.poll(m[2]));
  } catch (e) {
    console.error("[try-on] poll failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ status: "failed", error: "Couldn't fetch the result." });
  }
}
