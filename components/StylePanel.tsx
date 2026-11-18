"use client";
import { useEffect, useState } from "react";
import { Drawer, Icon } from "./ui";
import LookBoard from "./LookBoard";
import Suggestions from "./Suggestions";
import { startComposition, type EngineInput } from "@/lib/styling/engine";
import type { Look } from "@/lib/types";
import { useApp } from "@/lib/store/state";

/** "Style your black blazer." — the contextual styling drawer used across the Edits and the Wardrobe. */
export default function StylePanel({ open, onClose, input, initialLook, focusSlot, onTryOn }: {
  open: boolean; onClose: () => void; input: EngineInput; initialLook?: Look; focusSlot?: string; onTryOn?: (l: Look) => void;
}) {
  const { saveLook, toast } = useApp();
  const [look, setLook] = useState<Look | null>(null);
  const [focus, setFocus] = useState<string | undefined>(focusSlot);

  useEffect(() => {
    if (!open) return;
    setLook(initialLook?.meta ? { ...initialLook, id: initialLook.id + "_p" } : startComposition(input));
    setFocus(focusSlot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialLook, input.anchor.id]);

  if (!look) return null;
  const anchorName = input.anchor.name.replace(/^./, (c) => c.toLowerCase());

  return (
    <Drawer open={open} onClose={onClose} eyebrow="Designer's table" title={<>Style your <em>{anchorName}.</em></>}>
      <div className="style-panel">
        <div className="stack" style={{ alignContent: "start" }}>
          <LookBoard pieces={look.pieces} annotations={look.annotations} activeSlot={focus} onPieceClick={(p) => setFocus(p.slot)} />
          <ul className="why">{look.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
          {look.notes && <div className="hand-notes">{look.notes.map((n) => <span key={n}>{n}</span>)}</div>}
          <div className="row">
            {onTryOn && <button className="btn" onClick={() => onTryOn(look)}><Icon name="mirror" /> Preview on me</button>}
            <button className="btn ghost" onClick={() => { saveLook({ ...look, id: look.id + "_" + Date.now().toString(36) }); toast("Added to My Collection."); }}><Icon name="heart" /> Save look</button>
          </div>
        </div>
        <div>
          <p className="small muted" style={{ marginTop: 0 }}>Tap a suggestion and the outfit changes instantly. <span className="tag owned">Owned</span> marks pieces from your wardrobe.</p>
          <Suggestions look={look} input={input} onChange={setLook} focus={focus} onFocus={setFocus} />
        </div>
      </div>
    </Drawer>
  );
}
