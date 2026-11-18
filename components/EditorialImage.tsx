"use client";
import { useState } from "react";
import Flat from "./Flat";
import { makeGarment, parseGarmentText } from "@/lib/parse";
import { cx } from "@/lib/util";

/** Photograph with a quiet still-life fallback if the photo can't load. */
export default function EditorialImage({ src, alt, fallback, className, colour, position, style }: {
  src?: string; alt: string; fallback: string; word?: string; caption?: string; className?: string; colour?: boolean; position?: string; style?: React.CSSProperties;
}) {
  const [failed, setFailed] = useState(!src);
  const g = makeGarment({ ...parseGarmentText(fallback), name: fallback });
  return (
    <figure className={cx("ed-img", colour && "colour", failed && "is-fallback", className)} style={style}>
      {!failed && src ? (
        <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" style={position ? { objectPosition: position } : undefined} onError={() => setFailed(true)} />
      ) : (
        <div className="ed-fallback" role="img" aria-label={alt}><Flat garment={g} /></div>
      )}
    </figure>
  );
}
