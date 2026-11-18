"use client";
import LookBoard, { isBigPiece } from "./LookBoard";
import { EngineBadge, Icon } from "./ui";
import { DIRECTION_LABEL } from "@/lib/styling/engine";
import { categoryLabel } from "@/lib/taxonomy";
import type { Look, Piece } from "@/lib/types";
import { useApp } from "@/lib/store/state";
import { cx } from "@/lib/util";

export default function LookCard({
  look,
  index,
  onTryOn,
  onOpenPanel,
  onRegenPiece,
  onSave,
  showEngine,
}: {
  look: Look;
  index?: number;
  onTryOn?: (l: Look) => void;
  onOpenPanel?: (l: Look, slot?: string) => void;
  onRegenPiece?: (l: Look, slot: string) => void;
  onSave?: (l: Look) => void;
  showEngine?: boolean;
}) {
  const { isSaved, feedback, toast } = useApp();
  const saved = isSaved(look.id);
  return (
    <article className="look-card" style={{ animationDelay: `${(index ?? 0) * 70}ms` }}>
      <LookBoard
        pieces={look.pieces}
        annotations={look.annotations}
        onPieceClick={onOpenPanel ? (p: Piece) => onOpenPanel(look, p.slot) : undefined}
        stamp={<span className="tag dark">{String((index ?? 0) + 1).padStart(2, "0")} · {DIRECTION_LABEL[look.direction]}</span>}
      />
      <div className="look-body">
        <div className="look-top">
          <h3 className="look-title" style={{ margin: 0 }}>{look.title}</h3>
          <div className="palette" aria-label="Colour palette">
            {look.palette.map((c) => <span key={c.name} title={c.name} style={{ background: c.hex }} />)}
          </div>
        </div>
        {showEngine && <EngineBadge engine={look.engine} />}
        {(() => {
          const extra = look.annotations.filter((a) => { const p = look.pieces.find((x) => x.slot === a.slot); return p && !isBigPiece(p, look.pieces); });
          return extra.length ? <div className="hand-notes">{extra.map((a) => <span key={a.slot}>→ {a.text}</span>)}</div> : null;
        })()}

        <div className="pieces">
          {look.pieces.map((p) => (
            <div className="piece-row" key={p.slot}>
              <span className="sw" style={{ background: p.garment.colorHex ?? "#999" }} />
              <span>
                <span className="role">{p.anchor ? "Your piece" : categoryLabel(p.garment.category)}</span>
                {p.garment.name}
              </span>
              <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                {!p.anchor && (p.owned ? <span className="tag owned">Owned</span> : <span className="tag suggested">Suggested</span>)}
                {!p.anchor && onRegenPiece && (
                  <button className="icon-btn" style={{ width: 28, height: 28 }} title={`Swap the ${categoryLabel(p.garment.category).toLowerCase()} only`} aria-label="Regenerate this piece" onClick={() => onRegenPiece(look, p.slot)}>
                    <Icon name="refresh" size={13} />
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>

        <ul className="why">
          {look.why.map((w, i) => {
            const [h, ...rest] = w.split(":");
            return <li key={i}>{rest.length ? <><b>{h}:</b>{rest.join(":")}</> : w}</li>;
          })}
        </ul>
        {look.notes && (
          <div className="stack-sm">
            {look.notes.map((n) => <div key={n} className="hand" style={{ fontSize: 19, lineHeight: 1.1 }}>{n}</div>)}
          </div>
        )}
        <div className="row small">
          <span className="eyebrow" style={{ fontSize: 10 }}>Wear it to</span>
          {look.occasions.map((o) => <span key={o} className="tag">{o}</span>)}
        </div>

        <div className="card-actions">
          {onTryOn && <button className="btn" onClick={() => onTryOn(look)}><Icon name="mirror" /> Try this look on me</button>}
          {onOpenPanel && <button className="btn ghost" onClick={() => onOpenPanel(look)}>Play with it</button>}
          {onSave && (
            <button className={cx("icon-btn", saved && "dark")} style={{ width: 44, height: 44 }} aria-label={saved ? "Saved" : "Save look"} title={saved ? "Saved" : "Save look"} onClick={() => !saved && onSave(look)}>
              <Icon name="heart" />
            </button>
          )}
          <button className="icon-btn" style={{ width: 44, height: 44 }} title="More like this" aria-label="More like this" onClick={() => { feedback(look, 1); toast("Noted — MY GALA will lean this way."); }}>
            <Icon name="thumbUp" />
          </button>
          <button className="icon-btn" style={{ width: 44, height: 44 }} title="Less like this" aria-label="Less like this" onClick={() => { feedback(look, -1); toast("Got it — fewer looks like this."); }}>
            <Icon name="thumbDown" />
          </button>
        </div>
      </div>
    </article>
  );
}
