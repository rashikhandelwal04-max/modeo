"use client";
import GarmentPhoto from "./GarmentPhoto";
import type { Annotation, Piece } from "@/lib/types";
import { cx } from "@/lib/util";
import { categoryLabel } from "@/lib/taxonomy";

const CLOTH = new Set(["top", "bottom", "layer", "onepiece", "drape", "dupatta"]);

function span(p: Piece, isHero: boolean, clothCount: number) {
  if (isHero) return { gridColumn: "1 / span 3", gridRow: "1 / span 4" };
  if (CLOTH.has(p.role) || p.garment.category === "saree-blouse") return clothCount <= 1 ? { gridColumn: "span 3", gridRow: "span 2" } : { gridColumn: "span 2", gridRow: "span 2" };
  if (p.role === "footwear" || p.role === "bag") return { gridColumn: "span 1", gridRow: "span 1" };
  return { gridColumn: "span 1", gridRow: "span 1" };
}

function PieceVisual({ p }: { p: Piece }) {
  return <GarmentPhoto g={p.garment} />;
}

// hand-drawn arrows & circles — slightly irregular so they read as ink, not UI
function Note({ a, kind }: { a: Annotation; kind: "hero" | "cloth" }) {
  if (kind === "hero") {
    return (
      <>
        <svg className="ink-circle" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <path d="M18 52 C 14 26, 46 10, 74 16 C 96 22, 96 70, 70 84 C 44 96, 12 82, 16 50" />
        </svg>
        <div className="note hero-note">
          {a.text}
          <svg style={{ left: -30, top: -30, width: 36, height: 34 }} viewBox="0 0 36 34" aria-hidden>
            <path d="M32 32 C 24 26, 14 18, 6 4 M6 4 L6 13 M6 4 L14 8" />
          </svg>
        </div>
      </>
    );
  }
  return (
    <div className="note cloth-note">
      <svg style={{ right: -30, top: -26, width: 36, height: 32 }} viewBox="0 0 36 32" aria-hidden>
        <path d="M2 30 C 12 26, 22 18, 30 4 M30 4 L22 8 M30 4 L31 13" />
      </svg>
      {a.text}
    </div>
  );
}

export function isBigPiece(p: Piece, pieces: Piece[]) {
  const anchor = pieces.find((x) => x.anchor);
  const anchorIsCloth = anchor && (CLOTH.has(anchor.role) || anchor.garment.category === "saree-blouse");
  if (p.anchor && anchorIsCloth) return true;
  return CLOTH.has(p.role) || p.garment.category === "saree-blouse";
}

export default function LookBoard({
  pieces,
  annotations = [],
  onPieceClick,
  compact,
  stamp,
  className,
  activeSlot,
  accessories,
}: {
  pieces: Piece[];
  annotations?: Annotation[];
  onPieceClick?: (p: Piece) => void;
  compact?: boolean;
  stamp?: React.ReactNode;
  className?: string;
  activeSlot?: string;
  /** accessories & jewellery are optional — hidden unless asked for */
  accessories?: boolean;
}) {
  if (!accessories) pieces = pieces.filter((p) => p.anchor || !["jewellery", "bag", "accessory"].includes(p.role));
  const anchor = pieces.find((p) => p.anchor);
  const anchorIsCloth = anchor && (CLOTH.has(anchor.role) || anchor.garment.category === "saree-blouse");
  const hero = anchorIsCloth ? anchor : pieces.find((p) => CLOTH.has(p.role)) ?? anchor ?? pieces[0];
  const rest = pieces.filter((p) => p !== hero);
  const clothCount = rest.filter((p) => CLOTH.has(p.role) || p.garment.category === "saree-blouse").length;
  // order: clothing first, then footwear, bag, jewellery, accessories
  const order = (p: Piece) => (CLOTH.has(p.role) || p.garment.category === "saree-blouse" ? 0 : p.role === "footwear" ? 1 : p.role === "bag" ? 2 : p.anchor ? 0.5 : 3);
  const ordered = [hero, ...rest.sort((a, b) => order(a) - order(b))].filter(Boolean) as Piece[];
  const noteFor = (slot: string) => annotations.findIndex((a) => a.slot === slot);

  return (
    <div className={cx("board", compact && "compact", className)}>
      {stamp && <div className="board-stamp">{stamp}</div>}
      <div className="board-grid" style={{ gridAutoFlow: "dense", gridTemplateRows: "repeat(4, 1fr)" }}>
        {ordered.map((p) => {
          const ni = noteFor(p.slot);
          return (
            <div
              key={p.slot}
              className={cx("board-tile", p.anchor && "anchor")}
              style={{ ...span(p, p === hero, clothCount), outline: activeSlot === p.slot ? "1px solid var(--ink)" : undefined, outlineOffset: 4 }}
              onClick={onPieceClick ? () => onPieceClick(p) : undefined}
              title={p.garment.name}
              role={onPieceClick ? "button" : undefined}
              tabIndex={onPieceClick ? 0 : undefined}
              onKeyDown={onPieceClick ? (e) => (e.key === "Enter" || e.key === " ") && onPieceClick(p) : undefined}
            >
              <PieceVisual p={p} />
              {!compact && p.owned && !p.anchor && <span className="owned-dot">Owned</span>}
              {!compact && p === hero && <span className="lbl">{p.anchor ? "Your piece" : categoryLabel(p.garment.category)}</span>}
              {!compact && ni >= 0 && isBigPiece(p, pieces) && <Note a={annotations[ni]} kind={p === hero ? "hero" : "cloth"} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
