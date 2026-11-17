"use client";
import { ATTRIBUTE_OPTIONS, CATEGORY_GROUPS, CATEGORIES } from "@/lib/taxonomy";
import { COLORS, hexOf } from "@/lib/colors";
import type { Category, GarmentAttributes, Season } from "@/lib/types";
import { cx } from "@/lib/util";

type Attrs = Partial<GarmentAttributes>;

function Sel({ label, value, options, onChange }: { label: string; value?: string; options: readonly string[]; onChange: (v?: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select className="select" value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">—</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function Multi({ label, value = [], options, onChange }: { label: string; value?: string[]; options: readonly string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="chips">
        {options.map((o) => (
          <button type="button" key={o} className={cx("chip", value.includes(o) && "on")} onClick={() => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o])}>{o}</button>
        ))}
      </div>
    </div>
  );
}

export default function GarmentEditor({ value, onChange, full }: { value: Attrs; onChange: (v: Attrs) => void; full?: boolean }) {
  const up = (patch: Attrs) => onChange({ ...value, ...patch });
  return (
    <div className="stack">
      <label className="field">
        <span>Garment category</span>
        <select className="select" value={value.category ?? ""} onChange={(e) => up({ category: (e.target.value || undefined) as Category | undefined })}>
          <option value="">Choose…</option>
          {CATEGORY_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.items.map((c) => <option key={c} value={c}>{CATEGORIES[c].label}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
      <div className="field">
        <span>Colour {value.color && <b style={{ color: "var(--ink)", letterSpacing: "0.06em", textTransform: "none", fontWeight: 400 }}>· {value.color}</b>}</span>
        <div className="swatches">
          {COLORS.filter((c) => c.name !== "pearl").map((c) => (
            <button type="button" key={c.name} title={c.name} aria-label={c.name} className={cx("swatch-btn", value.color === c.name && "on")} style={{ background: c.hex, width: 24, height: 24 }} onClick={() => up({ color: c.name, colorHex: hexOf(c.name) })} />
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Sel label="Length" value={value.length} options={ATTRIBUTE_OPTIONS.length} onChange={(length) => up({ length })} />
        <Sel label="Fabric" value={value.fabric} options={ATTRIBUTE_OPTIONS.fabric} onChange={(fabric) => up({ fabric })} />
        <Sel label="Fit" value={value.fit} options={ATTRIBUTE_OPTIONS.fit} onChange={(fit) => up({ fit })} />
        <Sel label="Silhouette" value={value.silhouette} options={ATTRIBUTE_OPTIONS.silhouette} onChange={(silhouette) => up({ silhouette })} />
        <Sel label="Pattern" value={value.pattern} options={ATTRIBUTE_OPTIONS.pattern} onChange={(pattern) => up({ pattern })} />
        <Sel label="Occasion" value={value.occasion?.[0]} options={ATTRIBUTE_OPTIONS.occasion} onChange={(o) => up({ occasion: o ? [o, ...(value.occasion ?? []).filter((x) => x !== o)].slice(0, 3) : [] })} />
      </div>
      {full && (
        <>
          <Multi label="Season" value={value.season} options={ATTRIBUTE_OPTIONS.season} onChange={(season) => up({ season: season as Season[] })} />
          <Multi label="Style" value={value.style} options={ATTRIBUTE_OPTIONS.style} onChange={(style) => up({ style })} />
          <Multi label="Occasions" value={value.occasion} options={ATTRIBUTE_OPTIONS.occasion} onChange={(occasion) => up({ occasion })} />
        </>
      )}
      <label className="field">
        <span>Detail (optional)</span>
        <input className="input" placeholder="e.g. gold detailing, pearl buttons" value={value.detail ?? ""} onChange={(e) => up({ detail: e.target.value || undefined })} />
      </label>
    </div>
  );
}
