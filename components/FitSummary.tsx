"use client";
import { fitOf, fitSummary } from "@/lib/fit";
import type { StyleProfile } from "@/lib/types";

/** Minimal "Your fit" card — what works for you, and what it does. */
export default function FitSummary({ profile, compact }: { profile: Partial<StyleProfile>; compact?: boolean }) {
  const s = fitSummary(fitOf(profile));
  if (!s.rules.length) return null;
  return (
    <section className={compact ? "fit-card compact" : "fit-card"}>
      <span className="eyebrow">Your fit</span>
      <h2 className="display h-md">{s.headline}</h2>
      <p className="fit-lead">{s.lead}</p>
      <ol className="fit-rules">
        {s.rules.map((r, i) => (
          <li key={r.title}><span className="n">{String(i + 1).padStart(2, "0")}</span><b>{r.title}</b><span>{r.why}</span></li>
        ))}
      </ol>
      {!compact && s.easy.length > 0 && <p className="fit-easy"><span className="eyebrow">Go easy on</span> {s.easy.join(" · ")}</p>}
    </section>
  );
}
