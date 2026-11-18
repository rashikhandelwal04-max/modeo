"use client";
import Link from "next/link";
import EditorialImage from "@/components/EditorialImage";
import LookBoard from "@/components/LookBoard";
import { Wordmark } from "@/components/brand";
import { useApp } from "@/lib/store/state";
import { useImage } from "@/lib/store/images";
import { EDITS, IMAGES } from "@/lib/editorial";
import type { SavedLook } from "@/lib/types";

function Thumb({ s }: { s: SavedLook }) {
  const img = useImage(s.tryOnImageId);
  return img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} /> : <LookBoard pieces={s.look.pieces} compact />;
}

export default function Home() {
  const { saved, photo } = useApp();
  const me = useImage(photo?.imageId);
  return (
    <main className="fade-in">
      <section className="home-hero">
        <EditorialImage src={IMAGES.heroLeft} alt="MY GALA campaign" fallback="Ivory satin slip dress" position="50% 20%" />
        {me ? <figure className="ed-img"><img src={me} alt="You" /></figure> : <EditorialImage src={IMAGES.heroRight} alt="MY GALA campaign" fallback="Black tailored blazer" position="50% 25%" />}
        <div className="center">
          <div>
            <Wordmark />
            <span className="tagline">Your style. Your stage.</span>
            <Link href="/edits" className="btn ghost sm" style={{ background: "rgba(255,255,255,0.85)" }}>Enter your edit</Link>
          </div>
        </div>
        <span className="sticker">New<br />season</span>
      </section>

      <div className="section-head"><span className="eyebrow" style={{ color: "var(--ink)" }}>Edits</span><Link href="/edits" className="link-btn">View all</Link></div>
      <div className="edit-row">
        {EDITS.map((e) => (
          <Link key={e.slug} href={`/edits/${e.slug}`} className="edit-card">
            <EditorialImage src={IMAGES[e.image]} alt={e.name} fallback={e.fallback} />
            <span>{e.name}</span>
          </Link>
        ))}
      </div>

      <div className="section-head"><span className="eyebrow" style={{ color: "var(--ink)" }}>Your looks</span><Link href={saved.length ? "/looks" : "/studio"} className="link-btn">{saved.length ? "Collection" : "Create a look"}</Link></div>
      <div className="looks-row">
        {saved.length ? saved.slice(0, 10).map((s) => (
          <Link key={s.id} href="/looks" className="look-thumb"><div className="frame"><Thumb s={s} /></div><span>{s.name}</span></Link>
        )) : (
          <Link href="/studio" className="look-thumb"><div className="frame" style={{ display: "grid", placeItems: "center" }}><span style={{ color: "var(--grey)" }}>+ New look</span></div></Link>
        )}
      </div>
    </main>
  );
}
