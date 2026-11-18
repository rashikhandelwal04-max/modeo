import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import net from "node:net";
import { parseGarmentText } from "@/lib/parse";
import { rateLimit, sameOrigin } from "@/lib/server/guard";

export const dynamic = "force-dynamic";

function isPrivateIp(ip: string) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const l = ip.toLowerCase();
  return l === "::1" || l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe80") || l.startsWith("::ffff:127.") || l === "::";
}

function meta(html: string, prop: string) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, "i");
  return (re.exec(html) ?? re2.exec(html))?.[1];
}
const decode = (s?: string) => s?.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

/** Read a product page's public metadata (title, image, description) to seed styling. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const limited = rateLimit(req, "url", 20);
  if (limited) return limited;
  const body = await req.json().catch(() => null);
  let url: URL;
  try {
    url = new URL(String(body?.url ?? ""));
  } catch {
    return NextResponse.json({ error: "That doesn't look like a valid link." }, { status: 400 });
  }
  if (!["http:", "https:"].includes(url.protocol)) return NextResponse.json({ error: "Only http(s) links are supported." }, { status: 400 });
  try {
    const { address } = await lookup(url.hostname);
    if (isPrivateIp(address)) return NextResponse.json({ error: "That address isn't allowed." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Couldn't reach that site." }, { status: 400 });
  }
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MYGALA-preview/1.0)", Accept: "text/html" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return NextResponse.json({ error: `The store responded with ${res.status}. Try describing the garment instead.` }, { status: 502 });
    const reader = res.body?.getReader();
    let html = "";
    if (reader) {
      const dec = new TextDecoder();
      while (html.length < 600_000) {
        const { done, value } = await reader.read();
        if (done) break;
        html += dec.decode(value, { stream: true });
      }
      reader.cancel().catch(() => {});
    }
    const title = decode(meta(html, "og:title") ?? /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1]) ?? "";
    const description = decode(meta(html, "og:description") ?? meta(html, "description")) ?? "";
    let image = decode(meta(html, "og:image") ?? meta(html, "twitter:image"));
    if (image) image = new URL(image, url).toString();
    const parsed = parseGarmentText(`${title} ${description}`);
    if (!title && !image) return NextResponse.json({ error: "Couldn't read product details from that page. Try describing it instead." }, { status: 422 });
    return NextResponse.json({ title, description: description.slice(0, 300), image, attributes: parsed, source: url.hostname });
  } catch {
    return NextResponse.json({ error: "Couldn't load that page (some stores block previews). Try describing it instead." }, { status: 502 });
  }
}
