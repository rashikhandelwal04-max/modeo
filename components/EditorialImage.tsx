"use client";
import { useState } from "react";
import { cx } from "@/lib/util";

/** Campaign photograph. If it can't load, a plain black field is shown — never an illustration. */
export default function EditorialImage({ src, alt, className, position, style }: {
  src?: string; alt: string; fallback?: string; word?: string; caption?: string; className?: string; colour?: boolean; position?: string; style?: React.CSSProperties;
}) {
  const [failed, setFailed] = useState(!src);
  return (
    <figure className={cx("ed-img", failed && "is-fallback", className)} style={style}>
      {!failed && src && <img src={src} alt={alt} style={position ? { objectPosition: position } : undefined} onError={() => setFailed(true)} />}
    </figure>
  );
}
