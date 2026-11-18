"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LookBoard from "@/components/LookBoard";
import { Drawer, Icon } from "@/components/ui";
import { useApp } from "@/lib/store/state";
import { useImage } from "@/lib/store/images";
import type { SavedLook } from "@/lib/types";
import { cx, formatDate } from "@/lib/util";
import { downloadDataUrl } from "@/lib/image";

function Cover({ s, full }: { s: SavedLook; full?: boolean }) {
  const img = useImage(s.tryOnImageId);
  if (img) return <img src={img} alt={s.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />;
  return <LookBoard pieces={s.look.pieces} compact={!full} />;
}

export default function Collection() {
  const { saved, collections, updateSaved, removeSaved, set, toast } = useApp();
  const router = useRouter();
  const [filter, setFilter] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const [newCol, setNewCol] = useState("");
  const list = useMemo(() => saved.filter((s) => filter === "All" || s.collection === filter), [saved, filter]);
  const open = saved.find((s) => s.id === openId) ?? null;
  const openImg = useImage(open?.tryOnImageId);
  const used = collections.filter((c) => saved.some((s) => s.collection === c));

  return (
    <main className="fade-in">
      <div className="page" style={{ paddingBottom: 0 }}>
        <div className="page-head" style={{ marginBottom: 10 }}>
          <h1 className="display h-md">Collection <span className="muted" style={{ fontSize: 12, letterSpacing: "0.1em" }}>{saved.length}</span></h1>
        </div>
        {used.length > 0 && (
          <div className="tabs">
            {["All", ...used].map((c) => <button key={c} className={cx("tab", filter === c && "on")} onClick={() => setFilter(c)}>{c}</button>)}
          </div>
        )}
      </div>

      {saved.length === 0 ? (
        <div className="empty" style={{ margin: "20px max(18px,3vw)" }}>
          <span className="eyebrow" style={{ color: "var(--ink)" }}>No saved looks yet</span>
          <div className="row" style={{ justifyContent: "center" }}><Link href="/edits" className="btn">Edits</Link><Link href="/studio" className="btn ghost">Studio</Link></div>
        </div>
      ) : (
        <div className="coll-grid">
          {list.map((s) => (
            <button key={s.id} className="look-tile" onClick={() => setOpenId(s.id)}>
              <div className="frame"><Cover s={s} /></div>
              <div className="cap"><b>{s.name}</b><span>{s.collection || formatDate(s.savedAt)}</span></div>
            </button>
          ))}
        </div>
      )}

      <Drawer open={!!open} onClose={() => setOpenId(null)} title={open?.name ?? ""}
        actions={open && (
          <>
            {openImg && <button className="icon-btn" aria-label="Download" onClick={() => downloadDataUrl(openImg, `my-gala-${open.name}.png`)}><Icon name="download" /></button>}
            <button className="icon-btn" aria-label="Delete" onClick={async () => { await removeSaved(open.id); setOpenId(null); toast("Deleted"); }}><Icon name="trash" /></button>
          </>
        )}>
        {open && (
          <div className="look-detail">
            <div className="frame" style={{ position: "relative" }}><Cover s={open} full /></div>
            <div className="stack" style={{ alignContent: "start" }}>
              <label className="field"><span>Name</span><input className="input underline" value={open.name} onChange={(e) => updateSaved(open.id, { name: e.target.value })} /></label>
              <div className="pieces">
                {open.look.pieces.map((p) => (
                  <div key={p.slot} className="piece-row">
                    <span className="sw" style={{ background: p.garment.colorHex }} />
                    <span>{p.garment.name}</span>
                    {!p.anchor && (p.owned ? <span className="tag owned">Owned</span> : <span className="tag suggested">Suggested</span>)}
                  </div>
                ))}
              </div>
              <div className="field">
                <span>Collection</span>
                <div className="chips">{collections.map((c) => <button key={c} className={cx("chip", open.collection === c && "on")} onClick={() => updateSaved(open.id, { collection: open.collection === c ? "" : c })}>{c}</button>)}</div>
                <div className="row" style={{ flexWrap: "nowrap", gap: 8 }}>
                  <input className="input" style={{ height: 34 }} placeholder="New collection" aria-label="New collection" value={newCol} onChange={(e) => setNewCol(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newCol.trim()) { set({ collections: [...collections, newCol.trim()] }); updateSaved(open.id, { collection: newCol.trim() }); setNewCol(""); } }} />
                </div>
              </div>
              <label className="field"><span>Notes</span><textarea className="textarea" value={open.notes} onChange={(e) => updateSaved(open.id, { notes: e.target.value })} /></label>
              <button className="btn" style={{ justifySelf: "start" }} onClick={() => { set({ tryOn: { look: open.look, variants: list.map((x) => x.look) } }); router.push("/try-on"); }}><Icon name="mirror" size={14} /> Try on</button>
            </div>
          </div>
        )}
      </Drawer>
    </main>
  );
}
