"use client";
import Link from "next/link";
import EditorialImage from "@/components/EditorialImage";
import { EDITS, IMAGES } from "@/lib/editorial";

export default function EditsIndex() {
  return (
    <main className="edits-grid fade-in" aria-label="Edits">
      {EDITS.map((e) => (
        <Link key={e.slug} href={`/edits/${e.slug}`} className="edit-card">
          <EditorialImage src={IMAGES[e.image]} alt={e.name} fallback={e.fallback} />
          <span>{e.name}</span>
        </Link>
      ))}
    </main>
  );
}
