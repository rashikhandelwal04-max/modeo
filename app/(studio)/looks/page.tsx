"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LookBoard from "@/components/LookBoard";
import { Drawer, EngineBadge, Icon } from "@/components/ui";
import { useApp } from "@/lib/store/state";
import { useImage } from "@/lib/store/images";
import { DIRECTION_LABEL } from "@/lib/styling/engine";
import { categoryLabel } from "@/lib/taxonomy";
import type { SavedLook } from "@/lib/types";
import { cx, formatDate } from "@/lib/util";
import { downloadDataUrl } from "@/lib/image";

function Cover({ s }: { s: SavedLook }) {
  const img = useImage(s.tryOnImageId);
  if (img) return <img className="tryon-img" src={img} alt={`${s.name} try-on`} />;
  return <LookBoard pieces={s.look.pieces} annotations={s.look.annotations} />;
}

export default function SavedLooks() {
  const { saved, collections, updateSaved, removeSaved, set, toast } = useApp();
  const router = useRouter();
  const [filter, setFilter] = useState<string>("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const [newCol, setNewCol] = useState("");
  const open = saved.find((s) => s.id === openId) ?? null;
  const openImg = useImage(open?.tryOnImageId);

  const list = useMemo(() => saved.filter((s) => filter === "All" || (filter === "Unsorted" ? !s.collection : s.collection === filter)), [saved, filter]);
  const count = (c: string) => saved.filter((s) => (c === "Unsorted" ? !s.collection : s.collection === c)).length;

  const addCollection = () => {
    const c = newCol.trim();
    if (!c || collections.includes(c)) return;
    set({ collections: [...collections, c] });
    if (open) updateSaved(open.id, { collection: c });
    setNewCol("");
  };

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <div className="eyebrow">Saved Looks · {saved.length}</div>
          <h1 className="display h-lg">Your <em>edit.</em></h1>
        </div>
      </div>
      <div className="tabs" style={{ marginBottom: 22 }}>
        {["All", ...collections, "Unsorted"].map((c) => (
          <button key={c} className={cx("tab", filter === c && "on")} onClick={() => setFilter(c)}>
            {c} <span className="serif-num" style={{ letterSpacing: 0 }}>{c === "All" ? saved.length : count(c)}</span>
          </button>
        ))}
      </div>

      {saved.length === 0 ? (
        <div className="empty" style={{ minHeight: 340, alignContent: "center" }}>
          <div className="display h-md">Nothing saved yet.</div>
          <p className="small muted" style={{ margin: 0 }}>Tap the heart on any look to keep it here, organised into collections.</p>
          <Link href="/studio" className="btn">Start styling</Link>
        </div>
      ) : list.length === 0 ? (
        <p className="muted">No looks in {filter} yet.</p>
      ) : (
        <div className="gallery">
          {list.map((s) => (
            <button key={s.id} className="saved-card" onClick={() => setOpenId(s.id)}>
              <Cover s={s} />
              <div className="look-body" style={{ gap: 6 }}>
                <div className="look-top"><span className="look-title" style={{ fontSize: 24 }}>{s.name}</span></div>
                <div className="row tiny muted" style={{ gap: 8 }}>
                  <span>{formatDate(s.savedAt)}</span>·<span>{DIRECTION_LABEL[s.look.direction]}</span>
                  {s.collection && <span className="tag">{s.collection}</span>}
                  {s.tryOnImageId && <span className="tag dark">Try-on</span>}
                </div>
                {s.notes && <div className="hand" style={{ fontSize: 18 }}>{s.notes}</div>}
              </div>
            </button>
          ))}
        </div>
      )}

      <Drawer
        open={!!open}
        onClose={() => setOpenId(null)}
        eyebrow={open ? `Saved ${formatDate(open.savedAt)} · ${DIRECTION_LABEL[open.look.direction]}` : ""}
        title={open?.name ?? ""}
        actions={open && <button className="icon-btn" aria-label="Delete look" title="Delete look" onClick={async () => { await removeSaved(open.id); setOpenId(null); toast("Look deleted."); }}><Icon name="trash" /></button>}
      >
        {open && (
          <div className="style-panel">
            <div className="stack">
              {openImg ? <img src={openImg} alt="Try-on" style={{ width: "100%", border: "1px solid var(--line)" }} /> : null}
              <LookBoard pieces={open.look.pieces} annotations={open.look.annotations} />
              <EngineBadge engine={open.look.engine} />
            </div>
            <div className="stack">
              <label className="field"><span>Outfit name</span><input className="input" value={open.name} onChange={(e) => updateSaved(open.id, { name: e.target.value })} /></label>
              <div className="field">
                <span>Collection</span>
                <div className="chips">
                  {collections.map((c) => <button key={c} className={cx("chip", open.collection === c && "on")} onClick={() => updateSaved(open.id, { collection: open.collection === c ? "" : c })}>{c}</button>)}
                </div>
                <div className="row" style={{ flexWrap: "nowrap", gap: 8 }}>
                  <input className="input" style={{ height: 36 }} placeholder="New collection…" value={newCol} onChange={(e) => setNewCol(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCollection()} />
                  <button className="btn sm" onClick={addCollection}>Add</button>
                </div>
              </div>
              <label className="field"><span>Personal notes</span><textarea className="textarea" placeholder="Wore this to… / swap the shoes for…" value={open.notes} onChange={(e) => updateSaved(open.id, { notes: e.target.value })} /></label>
              <div className="pieces">
                {open.look.pieces.map((p) => (
                  <div key={p.slot} className="piece-row">
                    <span className="sw" style={{ background: p.garment.colorHex }} />
                    <span><span className="role">{p.anchor ? "Your piece" : categoryLabel(p.garment.category)}</span>{p.garment.name}</span>
                    {!p.anchor && (p.owned ? <span className="tag owned">Owned</span> : <span className="tag suggested">Suggested</span>)}
                  </div>
                ))}
              </div>
              <ul className="why">{open.look.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
              <div className="row">
                <button className="btn" onClick={() => { set({ tryOn: { look: open.look, variants: [open.look] } }); router.push("/try-on"); }}><Icon name="mirror" /> Try this look on me</button>
                {openImg && <button className="btn ghost" onClick={() => downloadDataUrl(openImg, `modeo-${open.name}.png`)}><Icon name="download" /> Download</button>}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
