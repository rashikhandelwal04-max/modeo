"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LookBoard from "@/components/LookBoard";
import { Monogram } from "@/components/brand";
import { EngineBadge, Icon } from "@/components/ui";
import { useApp } from "@/lib/store/state";
import { useImage } from "@/lib/store/images";
import { DIRECTION_LABEL } from "@/lib/styling/engine";
import { categoryLabel } from "@/lib/taxonomy";
import type { SavedLook } from "@/lib/types";
import { cx, formatDate } from "@/lib/util";
import { downloadDataUrl } from "@/lib/image";

function LookPicture({ s }: { s: SavedLook }) {
  const img = useImage(s.tryOnImageId);
  return (
    <div className="look-pg-board">
      {img ? <img className="tryon-img" src={img} alt={`${s.name} try-on`} /> : <LookBoard pieces={s.look.pieces} annotations={s.look.annotations} />}
    </div>
  );
}

export default function MyCollection() {
  const { saved, collections, updateSaved, removeSaved, set, toast } = useApp();
  const router = useRouter();
  const [chapter, setChapter] = useState<string>("All");
  const [page, setPage] = useState(0); // 0 = cover, n = look n
  const [newCol, setNewCol] = useState("");
  const list = useMemo(() => saved.filter((s) => chapter === "All" || (chapter === "Unsorted" ? !s.collection : s.collection === chapter)), [saved, chapter]);
  const pages = list.length + 1;
  const cur = page > 0 ? list[page - 1] : null;
  const curImg = useImage(cur?.tryOnImageId);
  const month = new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" });

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea")) return;
      if (e.key === "ArrowRight") setPage((p) => Math.min(pages - 1, p + 1));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(0, p - 1));
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [pages]);
  useEffect(() => { if (page > pages - 1) setPage(Math.max(0, pages - 1)); }, [page, pages]);

  const count = (c: string) => saved.filter((s) => (c === "Unsorted" ? !s.collection : s.collection === c)).length;
  const openChapter = (c: string) => { setChapter(c); setPage(1); };
  const addCollection = () => {
    const c = newCol.trim();
    if (!c || collections.includes(c)) return;
    set({ collections: [...collections, c] });
    if (cur) updateSaved(cur.id, { collection: c });
    setNewCol("");
  };

  return (
    <main className="book fade-in">
      <div className="book-bar">
        <div className="row"><Monogram size={26} /><span className="eyebrow" style={{ color: "var(--ink)" }}>My Collection · Issue 01</span></div>
        <div className="tabs" style={{ borderBottom: 0 }}>
          {["All", ...collections, "Unsorted"].map((c) => (
            <button key={c} className={cx("tab", chapter === c && "on")} onClick={() => { setChapter(c); setPage(0); }}>{c} <span className="serif-num">{c === "All" ? saved.length : count(c)}</span></button>
          ))}
        </div>
      </div>

      {page === 0 || !cur ? (
        <div className="spread" key={`cover-${chapter}`}>
          <div className="pg cover">
            <div className="between"><span className="eyebrow" style={{ color: "#9a9a9a" }}>{month}</span><span className="eyebrow" style={{ color: "#9a9a9a" }}>{list.length} looks</span></div>
            <h1 className="mega">My<br /><em style={{ textTransform: "none" }}>Collection</em></h1>
            {list[0] ? (
              <div className="cover-look" style={{ background: "var(--white)" }}><LookBoard pieces={list[0].look.pieces} annotations={list[0].look.annotations} /></div>
            ) : (
              <div className="cover-look" style={{ display: "grid", placeItems: "center" }}><Monogram size="60%" ink="#2a2a2a" paper="var(--ink)" /></div>
            )}
            <span className="kicker">{chapter === "All" ? "Every look you've made yours." : `The ${chapter} chapter.`}</span>
          </div>
          <div className="pg">
            <span className="eyebrow">Contents</span>
            {saved.length === 0 ? (
              <div className="stack">
                <p className="pull-quote" style={{ margin: 0 }}>Your lookbook is waiting for its first page.</p>
                <p className="small muted" style={{ margin: 0 }}>Tap the heart on any look, in an Edit, the studio or the fitting room, to save it here.</p>
                <div className="row"><Link href="/edits" className="btn">Open an edit</Link><Link href="/studio" className="btn ghost">Go to the studio</Link></div>
              </div>
            ) : (
              <div className="toc">
                {["All", ...collections, "Unsorted"].map((c, i) => {
                  const n = c === "All" ? saved.length : count(c);
                  return (
                    <button key={c} onClick={() => n && openChapter(c)} disabled={!n} style={{ opacity: n ? 1 : 0.35 }}>
                      <span className="serif-num">{String(i + 1).padStart(2, "0")}</span>
                      <b>{c === "All" ? "Every look" : c}</b>
                      <span className="tiny muted">{n} {n === 1 ? "look" : "looks"}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {list.length > 0 && <button className="btn" style={{ alignSelf: "flex-start" }} onClick={() => setPage(1)}>Open the lookbook <Icon name="arrow" /></button>}
            <span className="hand" style={{ fontSize: 24, marginTop: "auto", transform: "rotate(-2deg)" }}>Use ← → to turn the pages.</span>
          </div>
        </div>
      ) : (
        <div className="spread" key={cur.id}>
          <div className="pg" style={{ padding: 0 }}>
            <LookPicture s={cur} />
            <span className="folio" style={{ left: 16, zIndex: 3 }}>{String(page * 2).padStart(2, "0")}</span>
          </div>
          <div className="pg">
            <div className="between">
              <span className="eyebrow">{cur.collection || "Unsorted"} · {DIRECTION_LABEL[cur.look.direction]}</span>
              <div className="row" style={{ gap: 6 }}>
                {curImg && <button className="icon-btn" aria-label="Download" title="Download" onClick={() => downloadDataUrl(curImg, `my-gala-${cur.name}.png`)}><Icon name="download" /></button>}
                <button className="icon-btn" aria-label="Delete look" title="Delete look" onClick={async () => { await removeSaved(cur.id); toast("Look removed from your collection."); }}><Icon name="trash" /></button>
              </div>
            </div>
            <input className="input underline" style={{ fontSize: 40, height: 64 }} value={cur.name} aria-label="Outfit name" onChange={(e) => updateSaved(cur.id, { name: e.target.value })} />
            <span className="tiny muted">Saved {formatDate(cur.savedAt)} · <EngineBadge engine={cur.look.engine} /></span>
            {cur.look.why[0] && <p className="pull-quote" style={{ margin: 0 }}>“{cur.look.why[0].split(":").slice(1).join(":").trim() || cur.look.why[0]}”</p>}
            <div className="pieces">
              {cur.look.pieces.map((p) => (
                <div key={p.slot} className="piece-row">
                  <span className="sw" style={{ background: p.garment.colorHex }} />
                  <span><span className="role">{p.anchor ? "The piece" : categoryLabel(p.garment.category)}</span>{p.garment.name}</span>
                  {!p.anchor && (p.owned ? <span className="tag owned">Owned</span> : <span className="tag suggested">Suggested</span>)}
                </div>
              ))}
            </div>
            <div className="field">
              <span>Chapter</span>
              <div className="chips">{collections.map((c) => <button key={c} className={cx("chip", cur.collection === c && "on")} onClick={() => updateSaved(cur.id, { collection: cur.collection === c ? "" : c })}>{c}</button>)}</div>
              <div className="row" style={{ flexWrap: "nowrap", gap: 8 }}>
                <input className="input" style={{ height: 34 }} placeholder="New chapter…" value={newCol} onChange={(e) => setNewCol(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCollection()} aria-label="New collection name" />
                <button className="btn sm" onClick={addCollection}>Add</button>
              </div>
            </div>
            <label className="field"><span>Editor&apos;s note</span><textarea className="textarea hand" style={{ fontSize: 20 }} placeholder="Wore this to… / swap the shoes for…" value={cur.notes} onChange={(e) => updateSaved(cur.id, { notes: e.target.value })} /></label>
            <button className="btn" style={{ alignSelf: "flex-start" }} onClick={() => { set({ tryOn: { look: cur.look, variants: list.map((x) => x.look) } }); router.push("/try-on"); }}><Icon name="mirror" /> Preview on me</button>
            <span className="folio" style={{ right: 16 }}>{String(page * 2 + 1).padStart(2, "0")}</span>
          </div>
        </div>
      )}

      <div className="book-nav">
        <button className="btn ghost sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}><Icon name="back" size={13} /> Previous</button>
        <div className="dots" aria-label="Pages">
          {Array.from({ length: pages }).map((_, i) => <button key={i} className={cx(i === page && "on")} aria-label={i === 0 ? "Cover" : `Look ${i}`} onClick={() => setPage(i)} />)}
        </div>
        <button className="btn ghost sm" disabled={page >= pages - 1} onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}>Next <Icon name="arrow" size={13} /></button>
      </div>
    </main>
  );
}
