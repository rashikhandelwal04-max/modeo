"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import GarmentPhoto from "@/components/GarmentPhoto";
import GarmentEditor from "@/components/GarmentEditor";
import LookCard from "@/components/LookCard";
import StylePanel from "@/components/StylePanel";
import { Drawer, EngineBadge, Icon } from "@/components/ui";
import { useApp } from "@/lib/store/state";
import { putImage, useImage } from "@/lib/store/images";
import { dominantColor, fileToDataUrl, resizeDataUrl } from "@/lib/image";
import { makeGarment, parseGarmentText } from "@/lib/parse";
import { requestLooks } from "@/lib/client";
import { regeneratePiece, type EngineInput } from "@/lib/styling/engine";
import { ATTRIBUTE_OPTIONS, CATEGORY_GROUPS, CATEGORIES, categoryLabel } from "@/lib/taxonomy";
import { COLORS } from "@/lib/colors";
import type { Category, Look, WardrobeItem } from "@/lib/types";
import { cx, uid } from "@/lib/util";

const SAMPLE: [string, Partial<WardrobeItem>][] = [
  ["Oversized black blazer", { occasion: ["work", "date night"], style: ["minimal"], fabric: "wool", season: ["autumn", "winter", "spring"] }],
  ["White cotton shirt", { occasion: ["work", "casual"], style: ["classic"], fit: "fitted" }],
  ["Blue straight-fit jeans", { occasion: ["casual", "weekend", "college"], style: ["classic"] }],
  ["Beige trench coat", { occasion: ["work", "travel"], style: ["classic"], season: ["spring", "autumn", "monsoon"] }],
  ["Black wide-leg trousers", { occasion: ["work", "formal"], style: ["minimal"], fabric: "crepe" }],
  ["Ivory satin camisole", { occasion: ["date night", "party"], style: ["romantic"] }],
  ["Grey knit top", { occasion: ["work", "casual"], style: ["minimal"], fabric: "knit" }],
  ["Yellow midi skirt", { occasion: ["brunch", "weekend"], style: ["romantic"], fabric: "satin" }],
  ["Black saree with gold detailing", { occasion: ["wedding", "festive"], style: ["traditional"], fabric: "georgette" }],
  ["Ivory chikankari kurta", { occasion: ["festive", "work", "casual"], style: ["traditional"], fabric: "cotton", pattern: "embroidered" }],
  ["Black leather loafers", { occasion: ["work"], style: ["classic"] }],
  ["White sneakers", { occasion: ["casual", "weekend", "travel"], style: ["sporty"] }],
  ["Gold hoop earrings", { occasion: ["casual", "work", "party"] }],
  ["Gold jhumkas", { occasion: ["festive", "wedding"] }],
  ["Black structured handbag", { occasion: ["work", "formal"] }],
  ["Tan kolhapuris", { occasion: ["casual", "festive"] }],
];

function ItemVisual({ item }: { item: WardrobeItem }) {
  return <GarmentPhoto g={item} />;
}

type Pending = { id: string; name: string };

const RAIL: Record<string, Category[]> = {
  Tops: ["shirt", "tshirt", "top", "camisole", "tank", "knit", "blouse"],
  Bottoms: ["trousers", "jeans", "shorts", "skirt"],
  "Dresses & sets": ["dress", "jumpsuit"],
  Layers: ["blazer", "jacket", "coat"],
  Desi: ["saree", "saree-blouse", "kurta", "kurti", "lehenga", "salwar-suit", "palazzo", "churidar", "dupatta", "ethnic-jacket", "indo-western"],
  Shoes: ["sneakers", "loafers", "heels", "boots", "flats", "sandals", "juttis", "kolhapuris"],
  Accessories: ["earrings", "jhumkas", "necklace", "bangles", "ring", "watch", "bag", "clutch", "potli", "belt", "scarf", "sunglasses"],
};

export default function Wardrobe() {
  const app = useApp();
  const { wardrobe, addWardrobe, updateWardrobe, removeWardrobe, status, profile, toast, saveLook, set } = app;
  const router = useRouter();
  const [pending, setPending] = useState<Pending[]>([]);
  const [f, setF] = useState({ category: "", color: "", occasion: "", season: "", style: "" });
  const [open, setOpen] = useState<WardrobeItem | null>(null);
  const [mode, setMode] = useState<"wardrobe" | "explore">("wardrobe");
  const [looks, setLooks] = useState<Look[] | null>(null);
  const [engine, setEngine] = useState<"claude" | "rules" | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [desc, setDesc] = useState("");
  const [panel, setPanel] = useState<{ look?: Look; slot?: string } | null>(null);
  const [rail, setRail] = useState<string>("All");

  const filtered = useMemo(
    () =>
      wardrobe.filter((w) => {
        if (rail !== "All" && !RAIL[rail].includes(w.category)) return false;
        if (f.category) {
          const group = CATEGORY_GROUPS.find((g) => g.label === f.category);
          if (group ? !group.items.includes(w.category) : w.category !== f.category) return false;
        }
        if (f.color && w.color !== f.color) return false;
        if (f.occasion && !w.occasion?.includes(f.occasion)) return false;
        if (f.season && !w.season?.includes(f.season as never)) return false;
        if (f.style && !w.style?.includes(f.style)) return false;
        return true;
      }),
    [wardrobe, f, rail],
  );

  const colorsInUse = Array.from(new Set(wardrobe.map((w) => w.color)));

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, 20);
    const ps = list.map((file) => ({ id: uid("w_"), name: file.name }));
    setPending((p) => [...ps, ...p]);
    let needReview = 0;
    await Promise.all(
      list.map(async (file, i) => {
        const id = ps[i].id;
        try {
          const raw = await fileToDataUrl(file);
          const small = await resizeDataUrl(raw, 800, 0.85);
          const imageId = uid("img_");
          await putImage(imageId, small);
          const dc = await dominantColor(small);
          let item: WardrobeItem = { ...makeGarment({ ...parseGarmentText(file.name.replace(/\.[a-z]+$/i, "").replace(/[_-]+/g, " ")), color: dc.name, colorHex: dc.hex, imageId }), id, addedAt: Date.now() };
          if (status?.claude) {
            const res = await fetch("/api/analyze-garment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: small }) });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.attributes) item = { ...item, ...data.attributes, id, imageId, aiDetected: true };
            else needReview++;
          } else {
            needReview++;
            item.name = parseGarmentText(file.name).category ? item.name : `New ${dc.name} piece`;
          }
          addWardrobe([item]);
        } catch {
          toast(`Couldn't read ${file.name}`);
        } finally {
          setPending((p) => p.filter((x) => x.id !== id));
        }
      }),
    );
    if (needReview) toast(status?.claude ? `${needReview} item(s) need a quick check.` : "Added. Colour was detected on-device — please confirm each item's category.");
  };

  const addSample = () => {
    const items: WardrobeItem[] = SAMPLE.map(([t, extra]) => ({ ...makeGarment({ ...parseGarmentText(t), ...extra, name: t }), addedAt: Date.now(), sample: true }));
    addWardrobe(items);
    toast("Sample wardrobe added — clearly marked as samples.");
  };

  const addByText = () => {
    const p = parseGarmentText(desc);
    if (!p.category) { toast("Include the garment type, e.g. 'navy linen trousers'."); return; }
    addWardrobe([{ ...makeGarment({ ...p, name: desc.trim().replace(/^./, (c) => c.toUpperCase()) }), addedAt: Date.now() }]);
    setDesc("");
    setAdding(false);
  };

  const howElse = async (item: WardrobeItem, m = mode) => {
    setLoading(true);
    setLooks(null);
    const res = await requestLooks({ anchor: item, anchorOwned: true, wardrobe, profile, mode: m });
    setLooks(res.looks);
    setEngine(res.engine);
    setLoading(false);
  };

  const engineInput: EngineInput | null = open ? { anchor: open, anchorOwned: true, wardrobe, profile, mode } : null;
  const current = open ? wardrobe.find((w) => w.id === open.id) ?? open : null;

  return (
    <main className="closet fade-in">
      <nav className="closet-rail" aria-label="Closet sections">
        {["All", ...Object.keys(RAIL)].map((r) => (
          <button key={r} className={cx(rail === r && "on")} onClick={() => setRail(r)}>
            {r} <small>{r === "All" ? wardrobe.length : wardrobe.filter((w) => RAIL[r].includes(w.category)).length}</small>
          </button>
        ))}
      </nav>
      <div className="closet-main">
      <div className="page-head" style={{ marginBottom: 6 }}>
        <div>
          <h1 className="display h-md">Wardrobe <span className="muted" style={{ fontSize: 12, letterSpacing: "0.1em" }}>{wardrobe.length}</span></h1>
        </div>
        <div className="row">
          <button className="btn ghost" onClick={() => setAdding((v) => !v)}><Icon name="pen" size={13} /> Add</button>
          <label className="btn" style={{ position: "relative" }}>
            <Icon name="upload" size={13} /> Upload
            <input type="file" accept="image/*" multiple onChange={(e) => { upload(e.target.files); e.target.value = ""; }} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} aria-label="Upload clothing photos" />
          </label>
        </div>
      </div>

      {adding && (
        <div className="panel pad row fade-in" style={{ marginBottom: 18, flexWrap: "nowrap" }}>
          <input className="input" autoFocus placeholder="e.g. Navy linen trousers" value={desc} onChange={(e) => setDesc(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addByText()} />
          <button className="btn" onClick={addByText}>Add</button>
        </div>
      )}

            <div className="filters" style={{ marginBottom: 26 }}>
        <span className="eyebrow">Filter</span>
        <select className="select" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORY_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              <option value={g.label}>All {g.label.toLowerCase()}</option>
              {g.items.map((c) => <option key={c} value={c}>{CATEGORIES[c].label}</option>)}
            </optgroup>
          ))}
        </select>
        <select className="select" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} aria-label="Colour">
          <option value="">All colours</option>
          {COLORS.filter((c) => colorsInUse.includes(c.name)).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <select className="select" value={f.occasion} onChange={(e) => setF({ ...f, occasion: e.target.value })} aria-label="Occasion">
          <option value="">All occasions</option>
          {ATTRIBUTE_OPTIONS.occasion.map((o) => <option key={o}>{o}</option>)}
        </select>
        <select className="select" value={f.season} onChange={(e) => setF({ ...f, season: e.target.value })} aria-label="Season">
          <option value="">All seasons</option>
          {ATTRIBUTE_OPTIONS.season.map((o) => <option key={o}>{o}</option>)}
        </select>
        <select className="select" value={f.style} onChange={(e) => setF({ ...f, style: e.target.value })} aria-label="Style">
          <option value="">All styles</option>
          {ATTRIBUTE_OPTIONS.style.map((o) => <option key={o}>{o}</option>)}
        </select>
        {Object.values(f).some(Boolean) && <button className="link-btn" onClick={() => setF({ category: "", color: "", occasion: "", season: "", style: "" })}>Clear</button>}
      </div>

      {wardrobe.length === 0 && pending.length === 0 ? (
        <div className="empty" style={{ minHeight: 360, alignContent: "center" }}>
          <span className="eyebrow" style={{ color: "var(--ink)" }}>Upload your clothes</span>
          <div className="row">
            <label className="btn" style={{ position: "relative" }}>Upload photos<input type="file" accept="image/*" multiple onChange={(e) => upload(e.target.files)} style={{ position: "absolute", inset: 0, opacity: 0 }} /></label>
            <button className="btn ghost" onClick={addSample}>Try a sample</button>
          </div>
        </div>
      ) : (
        <div className="w-grid">
          {pending.map((p) => (
            <div key={p.id} className="w-item" style={{ cursor: "default" }}>
              <div className="img skeleton" />
              <div className="meta"><span className="row tiny muted" style={{ gap: 8 }}><span className="spin" /> {status?.claude ? "Recognising…" : "Adding…"}</span></div>
            </div>
          ))}
          {filtered.map((w) => (
            <button key={w.id} className="w-item" onClick={() => { setOpen(w); setLooks(null); }}>
              <div className="img">
                <ItemVisual item={w} />
                {w.sample && <span className="tag" style={{ position: "absolute", top: 8, left: 8 }}>Sample</span>}
                {w.aiDetected && <span className="tag dark" style={{ position: "absolute", top: 8, right: 8 }}>AI</span>}
              </div>
              <div className="meta">
                <b>{w.name}</b>
                <span className="tiny muted">{categoryLabel(w.category)} · {w.color}{w.fabric ? ` · ${w.fabric}` : ""}</span>
              </div>
            </button>
          ))}
        </div>
      )}
      {wardrobe.length > 0 && filtered.length === 0 && <p className="muted">Nothing matches those filters.</p>}

      <Drawer
        open={!!current}
        onClose={() => setOpen(null)}
        eyebrow={current ? `${categoryLabel(current.category)}${current.sample ? " · sample item" : ""}` : ""}
        title={current?.name ?? ""}
        actions={current && (
          <button className="icon-btn" title="Delete item" aria-label="Delete item" onClick={async () => { await removeWardrobe(current.id); setOpen(null); toast("Removed from wardrobe."); }}><Icon name="trash" /></button>
        )}
      >
        {current && (
          <div className="stack" style={{ gap: 26 }}>
            <div className="split" style={{ gridTemplateColumns: "minmax(200px, 280px) 1fr" }}>
              <div className="stack-sm">
                <div className="w-item" style={{ cursor: "default" }}><div className="img"><ItemVisual item={current} /></div></div>
                {current.aiDetected && <span className="tiny muted">Attributes detected by AI — correct anything that&apos;s off.</span>}
              </div>
              <div className="stack">
                <label className="field"><span>Name</span><input className="input" value={current.name} onChange={(e) => updateWardrobe(current.id, { name: e.target.value })} /></label>
                <GarmentEditor full value={current} onChange={(v) => updateWardrobe(current.id, { ...v, aiDetected: false } as Partial<WardrobeItem>)} />
              </div>
            </div>

            <hr className="rule" />
            <div className="between">
              <h3 className="display h-sm" style={{ margin: 0 }}>How else can I wear this?</h3>
              <div className="row">
                <div className="seg" role="tablist" aria-label="Styling mode">
                  <button className={cx(mode === "wardrobe" && "on")} onClick={() => { setMode("wardrobe"); if (looks) howElse(current, "wardrobe"); }}>My wardrobe</button>
                  <button className={cx(mode === "explore" && "on")} onClick={() => { setMode("explore"); if (looks) howElse(current, "explore"); }}>Explore</button>
                </div>
                <button className="btn" onClick={() => howElse(current)} disabled={loading}>{loading ? "…" : looks ? "Refresh" : "Show me"}</button>
              </div>
            </div>
            {engine && looks && <EngineBadge engine={engine} />}
            {loading && <div className="looks">{[0, 1].map((i) => <div key={i} className="skeleton" style={{ height: 420 }} />)}</div>}
            {looks && (
              <div className="looks" style={{ gridTemplateColumns: "1fr" }}>
                {looks.map((l, i) => (
                  <LookCard
                    key={l.id}
                    look={l}
                    index={i}
                    onTryOn={(look) => { set({ tryOn: { look, variants: looks } }); router.push("/try-on"); }}
                    onSave={(look) => { saveLook(look); toast("Added to My Collection."); }}
                    onRegenPiece={(look, slot) => engineInput && setLooks(looks.map((x) => (x.id === look.id ? regeneratePiece(look, slot, engineInput, Date.now()) : x)))}
                    onOpenPanel={(look, slot) => setPanel({ look, slot })}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </Drawer>
      {engineInput && <StylePanel open={!!panel} onClose={() => setPanel(null)} input={engineInput} initialLook={panel?.look} focusSlot={panel?.slot} onTryOn={(l) => { set({ tryOn: { look: l, variants: looks ?? [l] } }); router.push("/try-on"); }} />}
      </div>
    </main>
  );
}
