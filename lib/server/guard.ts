import "server-only";
import { NextResponse } from "next/server";

/** Tiny in-memory rate limiter (per IP, per route). Replace with Redis/Upstash in production. */
const buckets = new Map<string, { n: number; reset: number }>();
export function rateLimit(req: Request, route: string, max = 20, windowMs = 60_000) {
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const k = `${route}:${ip}`;
  const now = Date.now();
  const b = buckets.get(k);
  if (!b || b.reset < now) {
    buckets.set(k, { n: 1, reset: now + windowMs });
    return null;
  }
  b.n++;
  if (b.n > max) return NextResponse.json({ error: "Too many requests — please wait a moment." }, { status: 429 });
  return null;
}

const DATA_URL = /^data:(image\/(jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
export function parseImageDataUrl(s: unknown, maxBytes = 8_000_000) {
  if (typeof s !== "string") return null;
  const m = DATA_URL.exec(s);
  if (!m) return null;
  if ((m[3].length * 3) / 4 > maxBytes) return null;
  return { mediaType: m[1] as "image/jpeg" | "image/png" | "image/webp", base64: m[3] };
}

export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser / same-origin navigation
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
