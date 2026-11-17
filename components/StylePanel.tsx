"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Drawer, Icon } from "./ui";
import LookBoard from "./LookBoard";
import { applyPanelOption, panelGroups, removePiece, startComposition, type EngineInput, type PanelGroup } from "@/lib/styling/engine";
import type { Look } from "@/lib/types";
import { cx } from "@/lib/util";
import { useApp } from "@/lib/store/state";

/**
 * "Style your black blazer." — the contextual, playful styling panel. Every click swaps a
 * piece, colour story, drape or hairstyle and the board updates instantly (local engine).
 */
export default function StylePanel({
  open,
  onClose,
  input,
  initialLook,
  focusSlot,
  onTryOn,
}: {
  open: boolean;
  onClose: () => void;
  input: EngineInput;
  initialLook?: Look;
  focusSlot?: string;
  onTryOn?: (l: Look) => void;
}) {
  const { saveLook, toast } = useApp();
  const [look, setLook] = useState<Look | null>(null);
  const [active, setActive] = useState<string | undefined>(focusSlot);
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!open) return;
    setLook(initialLook?.meta ? { ...initialLook, id: initialLook.id + "_p" } : startComposition(input));
    setActive(focusSlot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialLook, input.anchor.id]);

  useEffect(() => {
    if (open && focusSlot) {
      const k = focusSlot.replace(/-\d+$/, "");
      const el = groupRefs.current[focusSlot] ?? groupRefs.current[k] ?? groupRefs.current[`${k}-1`];
      setTimeout(() => el?.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
    }
  }, [open, focusSlot, look?.id]);

  const groups = useMemo(() => (look ? panelGroups(look, input) : []), [look, input]);
  if (!look) return null;

  const anchorName = input.anchor.name.replace(/^./, (c) => c.toLowerCase());
  const isOn = (g: PanelGroup, id: string) => {
    if (g.kind === "piece") return look.pieces.some((p) => p.slot === g.slot && p.key === id);
    if (g.kind === "color") return look.meta?.pal.base[0] === id || look.meta?.pal.metal === id;
    const [t, i] = id.split(":");
    return (look.notes ?? []).some((n) => n.startsWith(t === "drape" ? "Drape:" : "Hair:") && n.includes(g.options[+i]?.sub ?? g.options[+i]?.label));
  };
  const optional = (g: PanelGroup) => g.kind === "piece" && ["layer", "accessory", "dupatta", "necklace", "bangles"].includes(g.slot!.replace(/-\d+$/, ""));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow="Interactive styling"
      title={<>Style your <em>{anchorName}.</em></>}
    >
      <div className="style-panel">
        <div className="stack" style={{ alignContent: "start" }}>
          <LookBoard
            pieces={look.pieces}
            annotations={look.annotations}
            activeSlot={active}
            onPieceClick={(p) => {
              setActive(p.slot);
              const el = groupRefs.current[p.slot] ?? groupRefs.current[p.slot.replace(/-\d+$/, "")];
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          />
          <ul className="why">{look.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
          {look.notes && look.notes.map((n) => <div key={n} className="hand" style={{ fontSize: 20, lineHeight: 1.1 }}>{n}</div>)}
          <div className="row">
            {onTryOn && <button className="btn" onClick={() => onTryOn(look)}><Icon name="mirror" /> Try this look on me</button>}
            <button className="btn ghost" onClick={() => { saveLook({ ...look, id: look.id + "_" + Date.now().toString(36) }); toast("Saved to your looks."); }}><Icon name="heart" /> Save look</button>
          </div>
        </div>

        <div>
          <p className="small muted" style={{ marginTop: 0 }}>Tap any suggestion — the outfit updates instantly. <span className="tag owned" style={{ marginLeft: 6 }}>Owned</span> marks pieces from your wardrobe.</p>
          {groups.map((g) => (
            <div key={g.id} className="opt-group" ref={(el) => { groupRefs.current[g.id] = el; }} style={active && (g.id === active || g.id === active.replace(/-\d+$/, "")) ? { background: "var(--white)", margin: "0 -12px", padding: "14px 12px" } : undefined}>
              <div className="eyebrow">{g.label}</div>
              <div className="chips">
                {g.options.map((o) => (
                  <button
                    key={o.id}
                    className={cx("chip", isOn(g, o.id) && "on", o.owned && "owned")}
                    title={o.sub}
                    onClick={() => {
                      setLook(applyPanelOption(look, g, o.id, input));
                      if (g.slot) setActive(g.slot);
                    }}
                  >
                    {o.swatch && <span className="sw" style={{ background: o.swatch }} />}
                    {o.label}
                  </button>
                ))}
                {optional(g) && look.pieces.some((p) => p.slot === g.slot) && (
                  <button className="chip" style={{ borderStyle: "dashed" }} onClick={() => setLook(removePiece(look, g.slot!, input))}>None</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Drawer>
  );
}
