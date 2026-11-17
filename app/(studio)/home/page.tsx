"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import LookBoard from "@/components/LookBoard";
import { Icon } from "@/components/ui";
import { useApp } from "@/lib/store/state";
import { useImage } from "@/lib/store/images";
import { buildLook } from "@/lib/styling/engine";
import { makeGarment, parseGarmentText } from "@/lib/parse";
import { hashStr } from "@/lib/util";

const ACTIONS = [
  { t: "Style a garment", d: "Photo, link or a few words — four directions.", href: "/studio" },
  { t: "Build an outfit", d: "Piece by piece, in an interactive panel.", href: "/studio?start=build" },
  { t: "Explore my wardrobe", d: "New ways to wear what you already own.", href: "/wardrobe" },
  { t: "Try a new aesthetic", d: "Old money, streetwear, Indian contemporary…", href: "/studio?start=aesthetic" },
  { t: "Style for an occasion", d: "Work, wedding, date night, travel.", href: "/studio?start=occasion" },
];

const DAILY = ["Oversized black blazer", "Black saree with gold detailing", "Yellow midi skirt", "Beige trench coat", "Ivory chikankari kurta", "White linen shirt", "Burgundy satin slip dress"];

export default function Home() {
  const { wardrobe, saved, photo, profile, set } = useApp();
  const router = useRouter();
  const avatar = useImage(photo?.imageId);
  const today = new Date();
  const daySeed = hashStr(today.toDateString());

  const daily = useMemo(() => {
    const candidates = wardrobe.filter((w) => !["footwear", "jewellery", "bag", "accessory"].includes(w.category));
    const anchor = candidates.length ? candidates[daySeed % candidates.length] : makeGarment({ ...parseGarmentText(DAILY[daySeed % DAILY.length]), name: DAILY[daySeed % DAILY.length] });
    const dirs = ["minimal", "contemporary", "casual", "bold"] as const;
    return { anchor, owned: candidates.length > 0, look: buildLook({ anchor, wardrobe, profile }, dirs[daySeed % 4], new Set(), daySeed) };
  }, [wardrobe, profile, daySeed]);

  const openDaily = () => {
    set({ studio: { anchor: daily.anchor, anchorOwned: daily.owned, looks: undefined } });
    router.push("/studio");
  };

  return (
    <div className="home fade-in">
      <section className="home-hero">
        <div className="stack" style={{ gap: 14 }}>
          <div className="eyebrow">{today.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</div>
          <h1 className="display h-xl">What&apos;s the look <em>today?</em></h1>
          <p className="lede">AI that styles what you own, not just what you can buy.</p>
        </div>
        <nav className="actions" aria-label="Quick actions">
          {ACTIONS.map((a, i) => (
            <Link key={a.t} href={a.href} className="action">
              <span className="num">{String(i + 1).padStart(2, "0")}</span>
              <span><div className="t">{a.t}</div><div className="d">{a.d}</div></span>
              <span className="arrow"><Icon name="arrow" size={18} /></span>
            </Link>
          ))}
        </nav>
      </section>

      <section className="home-visual">
        <div className="between" style={{ padding: "18px 20px 0" }}>
          <div>
            <div className="eyebrow">Look of the day</div>
            <div className="display" style={{ fontSize: 30, marginTop: 4 }}>{daily.look.title}</div>
          </div>
          <button className="btn ghost sm" onClick={openDaily}>Style this</button>
        </div>
        <div style={{ flex: 1, minHeight: 330, cursor: "pointer" }} onClick={openDaily}>
          <LookBoard pieces={daily.look.pieces} annotations={daily.look.annotations} className="fill" />
        </div>
        <div className="small muted" style={{ padding: "0 20px 14px" }}>
          {daily.owned ? "Built around a piece from your wardrobe." : `Built around: ${daily.anchor.name.toLowerCase()}. Add your wardrobe to make this yours.`}
        </div>
        <div className="stat-row">
          <Link href="/wardrobe" className="stat"><b>{wardrobe.length}</b><span className="tiny muted">pieces in wardrobe</span></Link>
          <Link href="/looks" className="stat"><b>{saved.length}</b><span className="tiny muted">saved looks</span></Link>
          <Link href={photo ? "/try-on" : "/profile"} className="stat" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {avatar ? <img src={avatar} alt="" style={{ width: 30, height: 40, objectFit: "cover" }} /> : <b>—</b>}
            <span className="tiny muted">{photo ? "Your photo is ready for try-on" : "Add your photo for try-on"}</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
