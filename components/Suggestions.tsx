"use client";
import { useEffect, useMemo, useRef } from "react";
import { applyPanelOption, panelGroups, removePiece, type EngineInput, type PanelGroup } from "@/lib/styling/engine";
import type { Look } from "@/lib/types";
import { cx } from "@/lib/util";

/** Contextual styling suggestions for the garment being styled. Every click updates the look instantly. */
export default function Suggestions({ look, input, onChange, focus, onFocus, title }: {
  look: Look; input: EngineInput; onChange: (l: Look) => void; focus?: string; onFocus?: (slot?: string) => void; title?: React.ReactNode;
}) {
  const groups = useMemo(() => panelGroups(look, input), [look, input]);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!focus) return;
    const k = focus.replace(/-\d+$/, "");
    const el = refs.current[focus] ?? refs.current[k] ?? refs.current[`${k}-1`];
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [focus]);

  const isOn = (g: PanelGroup, id: string) => {
    if (g.kind === "piece") return look.pieces.some((p) => p.slot === g.slot && p.key === id);
    if (g.kind === "color") return look.meta?.pal.base[0] === id || look.meta?.pal.metal === id;
    const [, i] = id.split(":");
    const o = g.options[+i];
    return (look.notes ?? []).some((n) => n.includes(o?.sub ?? o?.label ?? "§"));
  };
  const optional = (g: PanelGroup) => g.kind === "piece" && ["layer", "accessory", "dupatta", "necklace", "bangles"].includes(g.slot!.replace(/-\d+$/, ""));
  const focused = (g: PanelGroup) => !!focus && (g.id === focus || g.id === focus.replace(/-\d+$/, ""));

  return (
    <div>
      {title}
      {groups.map((g) => (
        <div key={g.id} className={cx("opt-group", focused(g) && "focus")} ref={(el) => { refs.current[g.id] = el; }}>
          <div className="eyebrow">{g.label}</div>
          <div className="chips">
            {g.options.map((o) => (
              <button key={o.id} className={cx("chip", isOn(g, o.id) && "on", o.owned && "owned")} title={o.sub}
                onClick={() => { onChange(applyPanelOption(look, g, o.id, input)); if (g.slot) onFocus?.(g.slot); }}>
                {o.swatch && <span className="sw" style={{ background: o.swatch }} />}
                {o.label}
              </button>
            ))}
            {optional(g) && look.pieces.some((p) => p.slot === g.slot) && (
              <button className="chip" style={{ borderStyle: "dashed" }} onClick={() => onChange(removePiece(look, g.slot!, input))}>None</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
