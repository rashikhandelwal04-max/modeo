"use client";
import { useState } from "react";
import Flat from "./Flat";
import { makeGarment, parseGarmentText } from "@/lib/parse";
import { cx } from "@/lib/util";

/**
 * Campaign photograph with an art-directed fallback: if the photo can't load
 * (offline, blocked, removed), a fashion sketch on black with oversized italic type
 * takes its place — the layout never shows a broken image.
 */
export default function EditorialImage({ src, alt, fallback, word, className, caption, colour, position, style }: {
  src?: string; alt: string; fallback: string; word?: string; className?: string; caption?: string; colour?: boolean; position?: string; style?: React.CSSProperties;
}) {
  const [failed, setFailed] = useState(!src);
  const g = makeGarment({ ...parseGarmentText(fallback), name: fallback });
  return (
    <figure className={cx("ed-img", colour && "colour", className)} style={style}>
      {!failed && src ? (
        <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" style={position ? { objectPosition: position } : undefined} onError={() => setFailed(true)} />
      ) : (
        <div className="ed-fallback" role="img" aria-label={alt}>
          <span className="bigtype">{word ?? "Gala"}</span>
          <Flat garment={g} />
        </div>
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
