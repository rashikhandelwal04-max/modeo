"use client";
import { useState } from "react";
import { useApp } from "@/lib/store/state";
import { useGarmentImage } from "@/lib/garmentImage";
import { cx } from "@/lib/util";

/** Editorial photo: your own file in /public first, then a generated editorial photo, else black. */
export default function CampaignPhoto({ file, prompt, alt, className, position }: { file?: string; prompt: string; alt: string; className?: string; position?: string }) {
  const { status } = useApp();
  const [fileFailed, setFileFailed] = useState(!file);
  const { src, loading } = useGarmentImage(fileFailed ? prompt : undefined, !!status?.imageGen);
  const img = !fileFailed ? file : src;
  return (
    <figure className={cx("campaign", !img && "empty", loading && "loading", className)}>
      {img && <img src={img} alt={alt} style={position ? { objectPosition: position } : undefined} onError={() => !fileFailed && setFileFailed(true)} />}
    </figure>
  );
}
