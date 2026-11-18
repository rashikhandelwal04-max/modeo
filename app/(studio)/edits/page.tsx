"use client";
import Link from "next/link";
import EditorialImage from "@/components/EditorialImage";
import { Icon } from "@/components/ui";
import { EDITS, IMAGES } from "@/lib/editorial";

export default function EditsIndex() {
  return (
    <main className="edits-index fade-in" aria-label="The Edits">
      {EDITS.map((e) => (
        <Link key={e.slug} href={`/edits/${e.slug}`} className={`edit-tile edit-theme-${e.slug}`}>
          <EditorialImage src={IMAGES[e.image]} alt={e.title.join(" ")} fallback={e.fallback} word={e.title[0].replace("The ", "")} />
          <span className="num">{e.number}</span>
          <div className="stack">
            <h3>{e.title[0]}<br /><em>{e.title[1]}</em></h3>
            <p style={{ margin: 0 }}>{e.intro}</p>
            <span className="go">Enter <Icon name="arrow" size={14} /></span>
          </div>
        </Link>
      ))}
    </main>
  );
}
