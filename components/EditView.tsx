"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import EditorialImage from "./EditorialImage";
import LookBoard from "./LookBoard";
import StylePanel from "./StylePanel";
import { EngineBadge, Icon } from "./ui";
import { useApp } from "@/lib/store/state";
import { editBySlug, IMAGES, type Chapter, type EditSlug } from "@/lib/editorial";
import { DIRECTION_LABEL, generateLooks, type EngineInput } from "@/lib/styling/engine";
import { makeGarment, parseGarmentText } from "@/lib/parse";
import type { Direction, Garment, Look } from "@/lib/types";
import { cx, hashStr } from "@/lib/util";
import { roleOf } from "@/lib/taxonomy";

const ORDER: Record<EditSlug, Direction[]> = {
  daily: ["casual", "minimal", "contemporary", "bold"],
  statement: ["bold", "contemporary", "casual", "minimal"],
  classic: ["minimal", "contemporary", "casual", "bold"],
  desi: ["contemporary", "minimal", "bold", "casual"],
  yours: ["contemporary", "minimal", "casual", "bold"],
};

export default function EditView({ slug }: { slug: string }) {
  const edit = editBySlug(slug);
  const { wardrobe, profile, saved, set, saveLook, toast, addWardrobe } = useApp();
  const router = useRouter();
  const [ci, setCi] = useState(0);
  const [li, setLi] = useState(0);
  const [shuffle, setShuffle] = useState(0);
  const [panel, setPanel] = useState<{ look: Look; slot?: string } | null>(null);

  // Your Own Edit is built from the wardrobe: each clothing piece becomes a chapter
  const owned = wardrobe.filter((w) => !["footwear", "jewellery", "bag", "accessory"].includes(roleOf(w.category)));
  const chapters: (Chapter & { garment?: Garment })[] = useMemo(() => {
    if (!edit) return [];
    if (edit.slug !== "yours") return edit.chapters;
    return owned.slice(0, 6).map((w, i) => ({ id: w.id, label: w.name, anchor: w.name, note: i === 0 ? "Built only from what you own." : "Same piece. New story.", garment: w }));
  }, [edit, owned]);

  const chapter = chapters[Math.min(ci, Math.max(0, chapters.length - 1))];
  const input: EngineInput | null = useMemo(() => {
    if (!chapter) return null;
    const anchor = chapter.garment ?? makeGarment({ ...parseGarmentText(chapter.anchor), name: chapter.anchor, id: `edit-${slug}-${chapter.id}` } as never);
    return { anchor, anchorOwned: !!chapter.garment, nudges: chapter.nudges, occasion: chapter.occasion, wardrobe, profile, mode: slug === "yours" ? "wardrobe" : "explore" };
  }, [chapter, slug, wardrobe, profile]);
  const looks = useMemo(() => (input && edit ? generateLooks({ ...input, directions: ORDER[edit.slug], seed: hashStr(slug + chapter!.id) + shuffle * 7919 }) : []), [input, edit, slug, chapter, shuffle]);
  const look = looks[Math.min(li, looks.length - 1)];

  if (!edit) return <div className="page"><p>That edit doesn&apos;t exist. <Link href="/edits" className="link-btn">See all edits</Link></p></div>;

  const tryOn = (l: Look) => { set({ tryOn: { look: l, variants: looks } }); router.push("/try-on"); };
  const toStudio = () => { if (input) { set({ studio: { anchor: input.anchor, anchorOwned: input.anchorOwned, looks, occasion: input.occasion } }); router.push("/studio"); } };

  return (
    <main className={`edit-page edit-theme-${edit.slug} fade-in`}>
      <aside className="edit-side">
        <div className="between">
          <Link href="/edits" className="eyebrow">← All edits</Link>
          <span className="eyebrow">MY GALA · Edit {edit.number}/05</span>
        </div>
        <div className="edit-num">{edit.number}</div>
        <h1 className="display edit-title">{edit.title[0]} <em>{edit.title[1]}</em></h1>
        <p className="kicker" style={{ margin: 0 }}>{edit.kicker}</p>
        <p className="small" style={{ margin: 0, maxWidth: "44ch", opacity: 0.85 }}>{edit.intro}</p>

        {chapters.length > 0 ? (
          <div className="chapters" role="tablist" aria-label="Chapters">
            {chapters.map((c, i) => (
              <button key={c.id} role="tab" aria-selected={i === ci} className={cx("chapter", i === ci && "on")} onClick={() => { setCi(i); setLi(0); }}>
                <span className="n">{String(i + 1).padStart(2, "0")}</span>
                <span className="t">{c.label}</span>
                <span className="arrow"><Icon name="arrow" size={14} /></span>
              </button>
            ))}
          </div>
        ) : (
          <div className="stack">
            <p className="pull-quote" style={{ margin: 0 }}>Your edit begins with your wardrobe.</p>
            <div className="row">
              <Link href="/wardrobe" className="btn">Add my clothes</Link>
              <button className="btn ghost" onClick={() => { const items = ["White cotton shirt", "Blue straight-fit jeans", "Black wide-leg trousers", "Beige trench coat", "Black saree with gold detailing", "Black leather loafers", "Gold hoop earrings"].map((t) => ({ ...makeGarment({ ...parseGarmentText(t), name: t }), addedAt: Date.now(), sample: true })); addWardrobe(items); toast("Sample wardrobe added — marked as samples."); }}>Use a sample wardrobe</button>
            </div>
          </div>
        )}

        {edit.slug === "yours" && saved.length > 0 && (
          <div className="stack-sm">
            <span className="eyebrow">Also yours</span>
            <Link href="/looks" className="row small" style={{ gap: 8 }}><b style={{ fontWeight: 400 }}>{saved.length} saved looks in My Collection</b><Icon name="arrow" size={13} /></Link>
          </div>
        )}
      </aside>

      {look && input ? (
        <section className="edit-main">
          <div className="edit-spread">
            <div className="between">
              <div>
                <span className="eyebrow" style={{ color: "inherit", opacity: 0.7 }}>{chapter?.label} · {DIRECTION_LABEL[look.direction]}</span>
                <h2 className="display h-md" style={{ marginTop: 6 }}>{look.title}</h2>
              </div>
              <span className="hand" style={{ fontSize: 26, color: "var(--accent)", transform: "rotate(-3deg)" }}>{chapter?.note}</span>
            </div>
            <LookBoard key={look.id} pieces={look.pieces} annotations={look.annotations} onPieceClick={(p) => setPanel({ look, slot: p.slot })} />
            <ul className="why">{look.why.slice(0, 3).map((w, i) => { const [h, ...r] = w.split(":"); return <li key={i}>{r.length ? <><b>{h}:</b>{r.join(":")}</> : w}</li>; })}</ul>
            {look.notes && <div className="hand-notes" style={{ color: "inherit" }}>{look.notes.map((n) => <span key={n}>{n}</span>)}</div>}
            <div className="between">
              <div className="edit-actions">
                <button className="btn" onClick={() => setPanel({ look })}><Icon name="sparkle" /> Explore this outfit</button>
                <button className="btn ghost" onClick={() => tryOn(look)}><Icon name="mirror" /> Preview on me</button>
                <button className="btn ghost" onClick={() => { saveLook(look); toast("Added to My Collection."); }}><Icon name="heart" /> Save</button>
              </div>
              <EngineBadge engine={look.engine} />
            </div>
          </div>
          <div className="edit-rail">
            <EditorialImage src={IMAGES[edit.image]} alt={edit.title.join(" ")} fallback={edit.fallback} word={edit.number} caption={edit.kicker} />
            <div className="alt-looks">
              {looks.map((l, i) => (
                <button key={l.id} className={cx("alt-look", i === li && "on")} onClick={() => setLi(i)}>
                  <div className="mini"><LookBoard pieces={l.pieces} compact /></div>
                  <span><b>{l.title}</b><span className="tiny" style={{ opacity: 0.7 }}>{DIRECTION_LABEL[l.direction]}</span></span>
                </button>
              ))}
              <div className="row" style={{ padding: "12px 14px", borderTop: "1px solid var(--e-line)" }}>
                <button className="link-btn" onClick={() => { setShuffle((s) => s + 1); setLi(0); }}>Shuffle looks</button>
                <button className="link-btn" onClick={toStudio}>Take it to the studio</button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="edit-main" style={{ display: "grid", placeItems: "center", padding: 30 }}>
          <EditorialImage src={IMAGES[edit.image]} alt={edit.title.join(" ")} fallback={edit.fallback} style={{ width: "min(420px, 100%)", aspectRatio: "3/4" }} />
        </section>
      )}

      {input && <StylePanel open={!!panel} onClose={() => setPanel(null)} input={input} initialLook={panel?.look} focusSlot={panel?.slot} onTryOn={(l) => { setPanel(null); tryOn(l); }} />}
    </main>
  );
}
