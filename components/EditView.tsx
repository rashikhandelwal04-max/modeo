"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import EditorialImage from "./EditorialImage";
import LookBoard from "./LookBoard";
import StylePanel from "./StylePanel";
import { useApp } from "@/lib/store/state";
import { editBySlug, IMAGES } from "@/lib/editorial";
import { generateLooks, type EngineInput } from "@/lib/styling/engine";
import { makeGarment, parseGarmentText } from "@/lib/parse";
import type { Direction, Garment, Look } from "@/lib/types";
import { cx, hashStr } from "@/lib/util";
import { roleOf } from "@/lib/taxonomy";

const SHORT: Record<Direction, string> = { minimal: "Minimal", casual: "Easy", bold: "Bold", contemporary: "Modern" };
const SAMPLE = ["White cotton shirt", "Blue straight-fit jeans", "Black wide-leg trousers", "Beige trench coat", "Black saree with gold detailing", "Black leather loafers", "Gold hoop earrings"];

export default function EditView({ slug }: { slug: string }) {
  const edit = editBySlug(slug);
  const { wardrobe, profile, set, addWardrobe, toast } = useApp();
  const router = useRouter();
  const [pi, setPi] = useState(0);
  const [shuffle, setShuffle] = useState(0);
  const [open, setOpen] = useState<Look | null>(null);

  const pieces: { id: string; label: string; garment: Garment; owned: boolean }[] = useMemo(() => {
    if (!edit) return [];
    if (edit.slug === "mine") {
      return wardrobe.filter((w) => !["footwear", "jewellery", "bag", "accessory"].includes(roleOf(w.category))).slice(0, 8)
        .map((w) => ({ id: w.id, label: w.name, garment: w, owned: true }));
    }
    return edit.pieces.map((p) => ({ id: p.id, label: p.label, owned: false, garment: makeGarment({ ...parseGarmentText(p.anchor), name: p.anchor, id: `edit-${slug}-${p.id}` } as never) }));
  }, [edit, wardrobe, slug]);

  const cur = pieces[Math.min(pi, Math.max(0, pieces.length - 1))];
  const input: EngineInput | null = useMemo(() => (cur && edit ? {
    anchor: cur.garment, anchorOwned: cur.owned, nudges: edit.nudges, occasion: edit.occasion, wardrobe, profile, mode: edit.slug === "mine" ? "wardrobe" : "explore",
  } : null), [cur, edit, wardrobe, profile]);
  const looks = useMemo(() => (input ? generateLooks({ ...input, seed: hashStr(slug + cur!.id) + shuffle * 7919 }) : []), [input, slug, cur, shuffle]);

  if (!edit) return <main className="page"><Link href="/edits" className="link-btn">All edits</Link></main>;
  const tryOn = (l: Look) => { set({ tryOn: { look: l, variants: looks } }); router.push("/try-on"); };

  return (
    <main className="fade-in">
      <section className="edit-hero">
        <EditorialImage src={IMAGES[edit.image]} alt={edit.name} fallback={edit.fallback} />
        <h1>{edit.name}</h1>
      </section>

      {pieces.length > 0 ? (
        <>
          <div className="edit-bar">
            <div className="tabs" role="tablist">
              {pieces.map((p, i) => <button key={p.id} role="tab" aria-selected={i === pi} className={cx("tab", i === pi && "on")} onClick={() => setPi(i)}>{p.label}</button>)}
            </div>
            <button className="link-btn" onClick={() => setShuffle((s) => s + 1)}>Shuffle</button>
          </div>
          <div className="look-grid">
            {looks.map((l, i) => (
              <button key={l.id} className="look-tile" onClick={() => setOpen(l)}>
                <div className="frame"><LookBoard pieces={l.pieces} compact /></div>
                <div className="cap"><b>Look {String(i + 1).padStart(2, "0")}</b><span>{SHORT[l.direction]}</span></div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="empty" style={{ margin: 6 }}>
          <span className="eyebrow" style={{ color: "var(--ink)" }}>Add your clothes to start</span>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link href="/wardrobe" className="btn">Add clothes</Link>
            <button className="btn ghost" onClick={() => { addWardrobe(SAMPLE.map((t) => ({ ...makeGarment({ ...parseGarmentText(t), name: t }), addedAt: Date.now(), sample: true }))); toast("Sample wardrobe added"); }}>Try a sample</button>
          </div>
        </div>
      )}

      {input && <StylePanel open={!!open} onClose={() => setOpen(null)} input={input} initialLook={open ?? undefined} onTryOn={(l) => { setOpen(null); tryOn(l); }} />}
    </main>
  );
}
