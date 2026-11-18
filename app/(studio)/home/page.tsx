"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EditorialImage from "@/components/EditorialImage";
import LookBoard from "@/components/LookBoard";
import { Monogram } from "@/components/brand";
import { Icon } from "@/components/ui";
import { useApp } from "@/lib/store/state";
import { useImage } from "@/lib/store/images";
import { EDITS, IMAGES } from "@/lib/editorial";
import type { SavedLook } from "@/lib/types";
import { formatDate } from "@/lib/util";

function RecentCover({ s }: { s: SavedLook }) {
  const img = useImage(s.tryOnImageId);
  return img ? <img src={img} alt="" style={{ aspectRatio: "1/1.05", objectFit: "cover", width: "100%" }} /> : <LookBoard pieces={s.look.pieces} compact />;
}

export default function World() {
  const { saved, wardrobe, photo } = useApp();
  const router = useRouter();
  const me = useImage(photo?.imageId);
  const month = new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <main className="fade-in">
      {/* HERO */}
      <section className="hero">
        <div className="hero-copy">
          <Monogram className="hero-mono-bg" size="100%" />
          <div className="between" style={{ position: "relative" }}>
            <span className="eyebrow" style={{ color: "var(--ink)" }}>MY GALA · Issue 01 · {month}</span>
            <span className="eyebrow">A personal fashion universe</span>
          </div>
          <h1 className="mega hero-title" style={{ position: "relative" }}>
            <span>Your style.</span>
            <span className="l2 outline ink">Your stage.</span>
          </h1>
          <div className="hero-meta" style={{ position: "relative" }}>
            <p className="lede" style={{ margin: 0 }}>Enter your own fashion universe. Discover new ways to dress, create your own edits and reimagine everything in your wardrobe.</p>
            <Link href="/edits" className="btn big">Enter your edit <Icon name="arrow" /></Link>
          </div>
        </div>
        <div className="hero-visual">
          <EditorialImage className="main" src={IMAGES.heroMain} alt="MY GALA campaign" fallback="Black satin slip dress" word="Stage" caption="The Statement Edit — look 04" position="50% 20%" />
          {me ? (
            <figure className="ed-img second"><img src={me} alt="You" style={{ filter: "grayscale(1)" }} /><figcaption>Starring: you</figcaption></figure>
          ) : (
            <EditorialImage className="second" src={IMAGES.heroSecond} alt="MY GALA campaign detail" fallback="Oversized black blazer" word="Style" position="50% 30%" />
          )}
          <span className="sticker">New<br />season<br />new you</span>
          <span className="hand-tag">← this could be you</span>
          <span className="issue">Campaign<br />MG / 01</span>
        </div>
      </section>

      <div className="marquee" aria-hidden>
        <div>{Array.from({ length: 2 }).map((_, k) => (
          <span key={k}>{["Your style.", "Your stage.", "The Daily Edit", "The Statement Edit", "The Classic Edit", "The Desi Edit", "Your Own Edit"].map((t, i) => <span key={i}>{i % 2 ? <em>{t}</em> : t} ✦</span>)}</span>
        ))}</div>
      </div>

      {/* THE EDITS */}
      <section className="edits-strip" aria-label="The Edits">
        {EDITS.map((e) => (
          <Link key={e.slug} href={`/edits/${e.slug}`} className={`edit-tile edit-theme-${e.slug}`}>
            <EditorialImage src={IMAGES[e.image]} alt={e.title.join(" ")} fallback={e.fallback} word={e.title[0].replace("The ", "")} />
            <span className="num">{e.number}</span>
            <div className="stack-sm">
              <h3>{e.title[0]}<br /><em>{e.title[1]}</em></h3>
              <span className="small" style={{ opacity: 0.8 }}>{e.kicker}</span>
              <span className="go">Open the edit <Icon name="arrow" size={14} /></span>
            </div>
          </Link>
        ))}
      </section>

      {/* RECENT CREATIONS */}
      <section className="recent">
        <div className="recent-head">
          <div className="stack-sm">
            <span className="eyebrow">Recent creations</span>
            <h2 className="display h-md">Your <em>latest</em> looks.</h2>
          </div>
          <div className="stack-sm">
            <span className="small muted">{saved.length} saved · {wardrobe.length} pieces in your wardrobe</span>
            <div className="row">
              <Link href="/studio" className="btn sm">Create a look</Link>
              <Link href="/looks" className="link-btn">My Collection</Link>
            </div>
          </div>
        </div>
        <div className="recent-row">
          {saved.length === 0 ? (
            <div className="stack" style={{ padding: "28px clamp(16px,3vw,40px)", alignContent: "center" }}>
              <p className="pull-quote" style={{ margin: 0, maxWidth: "20ch" }}>Your first look is waiting to be made.</p>
              <span className="hand" style={{ fontSize: 24 }}>Start in the studio, or open an Edit →</span>
            </div>
          ) : (
            saved.slice(0, 10).map((s) => (
              <button key={s.id} className="recent-item" onClick={() => router.push("/looks")}>
                <RecentCover s={s} />
                <span className="cap"><b>{s.name}</b><span className="tiny muted">{formatDate(s.savedAt)}{s.collection ? ` · ${s.collection}` : ""}</span></span>
              </button>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
