"use client";
/**
 * YOUR EDIT — the personal stylist flow.
 * body (optional, once) → intent → piece type → your garment → pairings → outfit
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import GarmentPhoto from "@/components/GarmentPhoto";
import EditorialImage from "@/components/EditorialImage";
import { Icon } from "@/components/ui";
import { useApp } from "@/lib/store/state";
import { putImage } from "@/lib/store/images";
import { dominantColor, fileToDataUrl, resizeDataUrl } from "@/lib/image";
import { makeGarment, parseGarmentText } from "@/lib/parse";
import { IMAGES, OCCASIONS } from "@/lib/editorial";
import { useGarmentImage } from "@/lib/garmentImage";
import { COLORS, hexOf, nearestColor, cap } from "@/lib/colors";
import { categoryLabel, roleOf } from "@/lib/taxonomy";
import {
  accessoryOptions, footwearOptions, missingInfo, optionToGarment, pairingOptions, proportionTips, questionsFor, rolesToFill, shadesFor,
  ROLE_LABEL, type Option, type PairRole, type Question,
} from "@/lib/stylist";
import type { Category, Garment, GarmentAttributes, Look, Piece } from "@/lib/types";
import { cx, uid } from "@/lib/util";

/** Match parsed words to the option labels ("straight" → "Straight", "full-length" → "Full-length") and keep the user's own shade word. */
function normalise(p: Partial<GarmentAttributes>, text: string): Partial<GarmentAttributes> {
  const out: Partial<GarmentAttributes> = { ...p };
  if (p.category) {
    for (const q of questionsFor(p.category)) {
      const v = (p as Record<string, string | undefined>)[q.key];
      const hit = q.options.find((o) => (v && o.toLowerCase() === v.toLowerCase()) || new RegExp(`\\b${o.toLowerCase().replace(/[-&]/g, ".")}\\b`).test(text.toLowerCase().replace(/-fit/g, "")));
      if (hit) (out as Record<string, string>)[q.key] = hit;
    }
  }
  const t = text.toLowerCase();
  const m = /\b(jet[- ]black|off[- ]white|bottle[- ]green|navy[- ]blue|sky[- ]blue|baby[- ]pink|hot[- ]pink|dusty[- ]pink|[a-z]+ (?:yellow|red|blue|green|pink|black|white|grey|gray|brown|purple|orange)|mustard|butter|lemon|canary|marigold|ochre|ivory|cream|charcoal|camel|olive|emerald|maroon|wine|burgundy|beige|navy|teal|lilac|lavender|rust|coral|indigo)\b/.exec(t);
  if (m && out.color && !/^(a|an|the|wear|want|my|to|some)\b/.test(m[1])) out.shade = m[1].replace("-", " ");
  return out;
}

/** "Jet black full-length straight-fit trousers" — each detail once, in natural order. */
function describe(a: Partial<GarmentAttributes>): string {
  const bottoms = ["trousers", "jeans", "shorts", "palazzo", "churidar"].includes(a.category ?? "");
  const words: string[] = [];
  const push = (w?: string) => { if (!w) return; const lw = w.toLowerCase(); if (!words.some((x) => x.toLowerCase().replace("-fit", "") === lw.replace("-fit", ""))) words.push(lw); };
  push(a.shade ?? a.color);
  push(a.rise);
  push(a.length);
  push(a.fit ? (bottoms && /^(straight|slim|relaxed)$/i.test(a.fit) ? `${a.fit}-fit` : a.fit) : undefined);
  push(a.silhouette);
  push(a.neckline ? `${a.neckline}-neck`.replace(/-neck-neck$/i, "-neck").replace(/^(crew|collared|off-shoulder)-neck$/i, (m) => (/off/i.test(m) ? "off-shoulder" : m.replace("-neck", /collared/i.test(m) ? "" : "-neck"))) : undefined);
  push(a.sleeve && a.sleeve !== "Short" ? `${a.sleeve.toLowerCase()}${a.sleeve === "Sleeveless" ? "" : "-sleeve"}` : undefined);
  push(a.fabric);
  push(a.detail && a.category === "saree" ? `with ${a.detail}` : undefined);
  const cat = categoryLabel(a.category!).toLowerCase();
  const text = [...words.filter((w) => !w.startsWith("with ")), cat, ...words.filter((w) => w.startsWith("with "))].join(" ").replace(/\s+/g, " ").trim();
  return cap(text);
}

type Step = "body" | "intent" | "piece" | "garment" | "pair" | "outfit";

const PIECE_TYPES: { cat: Category; label: string }[] = [
  { cat: "skirt", label: "Skirt" }, { cat: "trousers", label: "Trousers" }, { cat: "jeans", label: "Jeans" }, { cat: "dress", label: "Dress" },
  { cat: "top", label: "Top" }, { cat: "shirt", label: "Shirt" }, { cat: "blazer", label: "Blazer" }, { cat: "saree", label: "Saree" },
  { cat: "kurta", label: "Kurta" }, { cat: "lehenga", label: "Lehenga" },
];
const POSES = ["Standing", "Walking", "Hand on hip", "Seated", "Over the shoulder"];
const BASE_COLORS = COLORS.filter((c) => c.name !== "pearl");

/** Stage C: the selected clothes shown together on a realistic generated model (Replicate). */
function ModelView({ anchor, picks, shoe, acc, pose }: { anchor: Garment; picks: Option[]; shoe: Option | null; acc: Option[]; pose?: string }) {
  const [who, setWho] = useState<"woman" | "man">("woman");
  const items = [anchor.name, ...picks.map((p) => p.name), shoe?.name, ...acc.map((a) => a.name)].filter(Boolean).map((x) => x!.toLowerCase()).join(", ");
  const prompt = `Full-length photorealistic fashion campaign photograph of a stylish ${who === "woman" ? "female" : "male"} model wearing exactly these clothes: ${items}. ${pose ? `Pose: ${pose.toLowerCase()}.` : "Standing naturally."} Minimalist light grey studio, soft natural light, realistic fabric and fit, sharp focus, head to toe in frame, no text.`;
  return (
    <figure className="model-view">
      <GarmentPhoto g={{ name: "The outfit on a model" }} prompt={prompt} className="model-photo" />
      <figcaption>
        <span className="eyebrow">On a model</span>
        <span className="seg"><button className={cx(who === "woman" && "on")} onClick={() => setWho("woman")}>Woman</button><button className={cx(who === "man" && "on")} onClick={() => setWho("man")}>Man</button></span>
      </figcaption>
    </figure>
  );
}

export default function YourEdit() {
  const { profile, set, wardrobe, status, saveLook, toast } = useApp();
  const router = useRouter();
  const [step, setStep] = useState<Step>(profile.askedBody ? "intent" : "body");
  const [occasion, setOccasion] = useState<string | undefined>();
  const [text, setText] = useState("");
  const [attrs, setAttrs] = useState<Partial<GarmentAttributes>>({});
  const [imageId, setImageId] = useState<string | undefined>();
  const [ownedId, setOwnedId] = useState<string | undefined>();
  const [mode, setMode] = useState<"details" | "photo" | "describe">("details");
  const [busy, setBusy] = useState<string | null>(null);
  const [roleIdx, setRoleIdx] = useState(0);
  const [picks, setPicks] = useState<Partial<Record<PairRole, Option>>>({});
  const [filters, setFilters] = useState<{ color?: string; shape?: string }>({});
  const [shoe, setShoe] = useState<Option | null>(null);
  const [extras, setExtras] = useState<{ accessories: boolean; footwear: boolean; poses: boolean }>({ accessories: false, footwear: false, poses: false });
  const [acc, setAcc] = useState<Option[]>([]);
  const [pose, setPose] = useState<string | undefined>();
  const [h, setH] = useState(profile.heightCm ? String(profile.heightCm) : "");
  const [w, setW] = useState(profile.weightKg ? String(profile.weightKg) : "");

  const anchor: Garment | null = useMemo(() => {
    if (!attrs.category) return null;
    const own = ownedId ? wardrobe.find((x) => x.id === ownedId) : undefined;
    if (own) return own;
    return makeGarment({ ...attrs, id: "anchor-" + (imageId ?? "draft"), imageId, name: describe(attrs) } as never);
  }, [attrs, imageId, ownedId, wardrobe]);

  const roles = anchor ? rolesToFill(anchor.category) : [];
  const role = roles[roleIdx];
  const options = useMemo(() => (anchor && role ? pairingOptions(anchor, role, occasion, profile) : []), [anchor, role, occasion, profile]);
  const shapeKey: "neckline" | "silhouette" | "fit" = role === "bottom" ? "silhouette" : role === "layer" ? "fit" : "neckline";
  const shapes = Array.from(new Set(options.map((o) => o[shapeKey]).filter(Boolean))) as string[];
  const colours = Array.from(new Set(options.map((o) => o.color)));
  const shown = options.filter((o) => (!filters.color || o.color === filters.color) && (!filters.shape || o[shapeKey] === filters.shape)).slice(0, filters.color || filters.shape ? 12 : 8);
  const shoes = anchor ? footwearOptions(anchor, occasion) : [];
  const accs = anchor ? accessoryOptions(anchor, occasion) : [];
  const chosen = Object.values(picks).filter(Boolean) as Option[];
  const tips = anchor ? proportionTips(anchor, chosen, profile) : [];
  const missing = missingInfo({ ...attrs, color: attrs.color }, !!imageId || !!ownedId);

  useEffect(() => { setFilters({}); }, [roleIdx, step]);
  useEffect(() => { if (step === "outfit" && !shoe && shoes[0]) setShoe(shoes[0]); }, [step, shoe, shoes]);

  // ---------------- actions ----------------
  const saveBody = (skip?: boolean) => {
    const hc = parseFloat(h), wk = parseFloat(w);
    set({ profile: { ...profile, askedBody: true, heightCm: !skip && hc > 90 && hc < 230 ? hc : profile.heightCm, weightKg: !skip && wk > 25 && wk < 250 ? wk : profile.weightKg } });
    setStep(anchor && chosen.length ? "outfit" : "intent");
  };
  const fromText = () => {
    const p = normalise(parseGarmentText(text), text);
    setAttrs(p);
    setImageId(undefined); setOwnedId(undefined); setPicks({}); setRoleIdx(0);
    if (!p.category) return setStep("piece");
    // everything we need was in the sentence → show the garment and go straight to pairing
    setStep(missingInfo(p, false).length === 0 ? "pair" : "garment");
  };
  const pickOccasion = (id: string) => { setOccasion(id === "specific" ? undefined : id); setStep("piece"); };
  const pickType = (cat: Category) => { setAttrs((a) => ({ ...a, category: cat })); setStep("garment"); };
  const pickOwned = (id: string) => { const it = wardrobe.find((x) => x.id === id); if (!it) return; setOwnedId(id); setAttrs(it); setStep("pair"); setRoleIdx(0); };

  const onPhoto = async (file?: File) => {
    if (!file) return;
    setBusy("Reading your photo…");
    try {
      const small = await resizeDataUrl(await fileToDataUrl(file), 1000, 0.88);
      const id = uid("g_");
      await putImage(id, small);
      setImageId(id);
      const dc = await dominantColor(small);
      setAttrs((a) => ({ ...a, color: a.color ?? dc.name, colorHex: a.colorHex ?? dc.hex }));
      if (status?.claude) {
        const res = await fetch("/api/analyze-garment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: small }) });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.attributes) {
          const a = data.attributes;
          setAttrs((x) => ({ ...x, category: x.category ?? a.category, fabric: x.fabric ?? a.fabric, silhouette: x.silhouette ?? a.silhouette, length: x.length ?? a.length, fit: x.fit ?? a.fit }));
        }
      }
    } catch { toast("That photo couldn't be read"); }
    setBusy(null);
  };
  const setAnswer = (q: Question, v: string) => setAttrs((a) => ({ ...a, [q.key]: a[q.key] === v ? undefined : v }));
  const setShade = (name: string, hex: string) => setAttrs((a) => ({ ...a, shade: name.toLowerCase(), colorHex: hex, color: a.color ?? nearestColor(hex).name }));

  const buildLook = (): Look | null => {
    if (!anchor) return null;
    const pieces: Piece[] = [{ role: roleOf(anchor.category), slot: "anchor", garment: anchor, key: "anchor", owned: true, anchor: true }];
    for (const o of chosen) pieces.push({ role: roleOf(o.category), slot: o.role, garment: optionToGarment(o), key: o.id, owned: false });
    if (shoe) pieces.push({ role: "footwear", slot: "footwear", garment: optionToGarment(shoe), key: shoe.id, owned: false });
    if (extras.accessories) acc.forEach((a, i) => pieces.push({ role: ["bag", "clutch", "potli"].includes(a.category) ? "bag" : ["belt", "watch", "sunglasses", "scarf"].includes(a.category) ? "accessory" : "jewellery", slot: `acc-${i}`, garment: optionToGarment(a), key: a.id, owned: false }));
    return {
      id: uid("look_"), direction: "minimal", title: `${cap(anchor.color)} ${categoryLabel(anchor.category)}`, pieces,
      palette: Array.from(new Set(pieces.map((p) => p.garment.color))).map((n) => ({ name: n, hex: hexOf(n) })),
      why: [...chosen.map((o) => o.why), ...tips], occasions: occasion ? [cap(occasion)] : [], annotations: [], notes: pose ? [`Pose: ${pose}`] : undefined, engine: "rules",
    };
  };

  const progress = ["intent", "piece", "garment", "pair", "outfit"].indexOf(step);

  // ---------------- render ----------------
  return (
    <main className="stylist fade-in">
      {step !== "body" && (
        <nav className="st-steps" aria-label="Progress">
          {["Occasion", "Your piece", "Pairing", "Outfit"].map((l, i) => {
            const idx = i === 0 ? 0 : i + 1;
            const on = progress >= idx;
            return <span key={l} className={cx(on && "on", progress === idx && "cur")}>{l}</span>;
          })}
        </nav>
      )}

      {/* ---------- BODY (optional, once) ---------- */}
      {step === "body" && (
        <section className="st-panel narrow">
          <h1 className="display h-lg">A little about you</h1>
          <p className="muted small">Optional. Used only as a rough guide for proportions. It never judges your body, and you can change it in Profile.</p>
          <div className="two">
            <label className="field"><span>Height (cm)</span><input className="input" inputMode="decimal" placeholder="e.g. 163" value={h} onChange={(e) => setH(e.target.value)} /></label>
            <label className="field"><span>Weight (kg)</span><input className="input" inputMode="decimal" placeholder="e.g. 58" value={w} onChange={(e) => setW(e.target.value)} /></label>
          </div>
          <div className="row"><button className="btn" onClick={() => saveBody()}>Continue</button><button className="link-btn" onClick={() => saveBody(true)}>Skip</button></div>
        </section>
      )}

      {/* ---------- INTENT ---------- */}
      {step === "intent" && (
        <section className="st-panel">
          <h1 className="display h-lg center">What are you looking for today?</h1>
          <div className="occ-grid">
            {OCCASIONS.map((o) => (
              <button key={o.id} className="occ" onClick={() => pickOccasion(o.id)}>
                <EditorialImage src={IMAGES[o.image]} alt={o.label} />
                <span>{o.label}</span>
              </button>
            ))}
          </div>
          <div className="ask">
            <input className="input underline" aria-label="Describe what you have in mind" placeholder="Or describe it — “I want to wear a yellow skirt”" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && text.trim() && fromText()} />
            <button className="btn" disabled={!text.trim()} onClick={fromText}>Go</button>
          </div>
        </section>
      )}

      {/* ---------- PIECE TYPE ---------- */}
      {step === "piece" && (
        <section className="st-panel">
          <button className="back" onClick={() => setStep("intent")}><Icon name="back" size={14} /> Back</button>
          <h1 className="display h-lg center">What would you like to wear?</h1>
          <div className="type-grid">
            {PIECE_TYPES.map((t) => (
              <button key={t.cat} className={cx("type", attrs.category === t.cat && "on")} onClick={() => pickType(t.cat)}>{t.label}</button>
            ))}
          </div>
          {wardrobe.length > 0 && (
            <>
              <span className="eyebrow center-block">Or something you own</span>
              <div className="own-row">
                {wardrobe.filter((x) => !["footwear", "jewellery", "bag", "accessory"].includes(roleOf(x.category))).slice(0, 12).map((x) => (
                  <button key={x.id} className="own" onClick={() => pickOwned(x.id)}><GarmentPhoto g={x} /><span>{x.name}</span></button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* ---------- YOUR GARMENT ---------- */}
      {step === "garment" && attrs.category && (
        <section className="st-split">
          <aside className="st-preview">
            {anchor && <GarmentPhoto g={anchor} className="big" />}
            <span className="eyebrow">Your piece</span>
            <span className="small">{anchor?.name}</span>
          </aside>
          <div className="st-form">
            <button className="back" onClick={() => setStep("piece")}><Icon name="back" size={14} /> Back</button>
            <h1 className="display h-md">Tell us about your {attrs.color && attrs.color !== "grey" ? `${attrs.shade ?? attrs.color} ` : ""}{categoryLabel(attrs.category).toLowerCase()}</h1>
            <div className="tabs" role="tablist">
              {([["details", "Choose details"], ["photo", "Upload a photo"], ["describe", "Describe it"]] as const).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={mode === k} className={cx("tab", mode === k && "on")} onClick={() => setMode(k)}>{l}</button>
              ))}
            </div>

            {mode === "photo" && (
              <label className="drop" style={{ minHeight: 150 }}>
                <input type="file" accept="image/*" aria-label="Upload a photo of your garment" onChange={(e) => onPhoto(e.target.files?.[0])} />
                <span className="stack-sm" style={{ justifyItems: "center" }}><Icon name="camera" size={20} /><span className="eyebrow">{busy ?? (imageId ? "Replace photo" : "Upload your actual piece")}</span></span>
              </label>
            )}
            {mode === "describe" && (
              <textarea className="textarea" placeholder="e.g. mustard pleated midi skirt in satin" aria-label="Describe your garment"
                onChange={(e) => { const p = parseGarmentText(e.target.value); setAttrs((a) => ({ ...a, ...Object.fromEntries(Object.entries(p).filter(([k, v]) => v && k !== "category")) })); }} />
            )}

            <div className="q">
              <span className="eyebrow">Colour {missing.includes("colour") && <i className="need">needed</i>}</span>
              <div className="swatches">
                {BASE_COLORS.map((c) => <button key={c.name} title={c.name} aria-label={c.name} className={cx("swatch-btn", attrs.color === c.name && "on")} style={{ background: c.hex }} onClick={() => setAttrs((a) => ({ ...a, color: c.name, colorHex: c.hex, shade: undefined }))} />)}
              </div>
              {attrs.color && (
                <div className="shades">
                  <span className="eyebrow">Exact shade</span>
                  <div className="chips">
                    {shadesFor(attrs.color).map((s) => <button key={s.name} className={cx("chip", attrs.shade === s.name.toLowerCase() && "on")} onClick={() => setShade(s.name, s.hex)}><span className="sw" style={{ background: s.hex }} />{s.name}</button>)}
                    <label className="chip" style={{ position: "relative" }}>Custom<input type="color" aria-label="Custom shade" value={attrs.colorHex ?? hexOf(attrs.color)} onChange={(e) => setShade("custom", e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} /></label>
                  </div>
                </div>
              )}
            </div>

            {questionsFor(attrs.category).map((q) => (
              <div className="q" key={q.key}>
                <span className="eyebrow">{q.label} {missing.includes(q.label.toLowerCase()) && <i className="need">needed</i>}</span>
                <div className="chips">{q.options.map((o) => <button key={o} className={cx("chip", attrs[q.key] === o && "on")} onClick={() => setAnswer(q, o)}>{o}</button>)}</div>
              </div>
            ))}

            <div className="row">
              <button className="btn" disabled={missing.length > 0} onClick={() => { setRoleIdx(0); setPicks({}); setStep("pair"); }}>See what goes with it <Icon name="arrow" size={14} /></button>
              {missing.length > 0 && <span className="tiny muted">Still need: {missing.join(", ")}{!imageId ? " — or upload a photo" : ""}</span>}
            </div>
          </div>
        </section>
      )}

      {/* ---------- PAIRING ---------- */}
      {step === "pair" && anchor && role && (
        <section className="st-split">
          <aside className="st-preview pair">
            <div className="pair-stack">
              <GarmentPhoto g={anchor} className="big" />
              {picks[role] ? <GarmentPhoto g={optionToGarment(picks[role]!)} className="big" /> : <div className="gphoto big placeholder"><span className="eyebrow">Choose a {ROLE_LABEL[role].toLowerCase().replace(/s$/, "")}</span></div>}
            </div>
            {picks[role] && <p className="small" style={{ margin: 0 }}>{picks[role]!.why}</p>}
          </aside>
          <div className="st-form">
            <button className="back" onClick={() => (roleIdx > 0 ? setRoleIdx(roleIdx - 1) : setStep(ownedId ? "piece" : "garment"))}><Icon name="back" size={14} /> Back</button>
            <h1 className="display h-md">{ROLE_LABEL[role]} for your {anchor.shade ?? anchor.color} {categoryLabel(anchor.category).toLowerCase()}</h1>
            <div className="filters">
              <div className="chips">
                <button className={cx("chip", !filters.color && "on")} onClick={() => setFilters((f) => ({ ...f, color: undefined }))}>All colours</button>
                {colours.map((c) => <button key={c} className={cx("chip", filters.color === c && "on")} onClick={() => setFilters((f) => ({ ...f, color: f.color === c ? undefined : c }))}><span className="sw" style={{ background: hexOf(c) }} />{cap(c)}</button>)}
              </div>
              <div className="chips">
                <button className={cx("chip", !filters.shape && "on")} onClick={() => setFilters((f) => ({ ...f, shape: undefined }))}>{shapeKey === "neckline" ? "All necklines" : shapeKey === "fit" ? "All fits" : "All shapes"}</button>
                {shapes.map((s) => <button key={s} className={cx("chip", filters.shape === s && "on")} onClick={() => setFilters((f) => ({ ...f, shape: f.shape === s ? undefined : s }))}>{s}</button>)}
              </div>
            </div>
            <div className="opt-grid">
              {shown.map((o) => (
                <button key={o.id} className={cx("opt", picks[role]?.id === o.id && "on")} onClick={() => setPicks((p) => ({ ...p, [role]: o }))}>
                  <GarmentPhoto g={optionToGarment(o)} />
                  <span className="opt-name">{o.name}</span>
                </button>
              ))}
            </div>
            <div className="row">
              <button className="btn" disabled={!picks[role]} onClick={() => (roleIdx < roles.length - 1 ? setRoleIdx(roleIdx + 1) : setStep("outfit"))}>{roleIdx < roles.length - 1 ? "Next" : "See the outfit"} <Icon name="arrow" size={14} /></button>
              {role === "layer" && <button className="link-btn" onClick={() => setStep("outfit")}>Skip the layer</button>}
            </div>
          </div>
        </section>
      )}

      {/* ---------- OUTFIT ---------- */}
      {step === "outfit" && anchor && (
        <section className="st-outfit">
          <div className="outfit-head">
            <button className="back" onClick={() => { setRoleIdx(Math.max(0, roles.length - 1)); setStep("pair"); }}><Icon name="back" size={14} /> Back</button>
            <h1 className="display h-md">Your outfit</h1>
            <div className="row">
              <button className="btn ghost" onClick={() => { const l = buildLook(); if (l) { saveLook(l); toast("Saved"); } }}><Icon name="heart" size={14} /> Save</button>
              <button className="btn" onClick={() => { const l = buildLook(); if (l) { set({ tryOn: { look: l, variants: [l] } }); router.push("/try-on" + (pose ? "?pose=" + encodeURIComponent(pose) : "")); } }}><Icon name="mirror" size={14} /> Try it on</button>
            </div>
          </div>
          <div className="outfit-stage">
            <ModelView anchor={anchor} picks={chosen} shoe={shoe} acc={extras.accessories ? acc : []} pose={pose} />
          <div className="outfit-row">
            <figure><GarmentPhoto g={anchor} /><figcaption>{anchor.name}<i>Yours</i></figcaption></figure>
            {chosen.map((o) => <figure key={o.id}><GarmentPhoto g={optionToGarment(o)} /><figcaption>{o.name}</figcaption></figure>)}
            {shoe && <figure className="shoe"><GarmentPhoto g={optionToGarment(shoe)} /><figcaption>{shoe.name}</figcaption></figure>}
            {extras.accessories && acc.map((a) => <figure key={a.id} className="shoe"><GarmentPhoto g={optionToGarment(a)} /><figcaption>{a.name}</figcaption></figure>)}
          </div>
          </div>

          <div className="extras">
            <button className={cx("chip", extras.footwear && "on")} onClick={() => setExtras((x) => ({ ...x, footwear: !x.footwear }))}>Change footwear</button>
            <button className={cx("chip", extras.accessories && "on")} onClick={() => setExtras((x) => ({ ...x, accessories: !x.accessories }))}>Add accessories</button>
            <button className={cx("chip", extras.poses && "on")} onClick={() => setExtras((x) => ({ ...x, poses: !x.poses }))}>Explore poses</button>
          </div>
          {extras.footwear && (
            <div className="opt-grid small-grid">
              {shoes.map((s) => <button key={s.id} className={cx("opt", shoe?.id === s.id && "on")} onClick={() => setShoe(s)}><GarmentPhoto g={optionToGarment(s)} /><span className="opt-name">{s.name}</span></button>)}
            </div>
          )}
          {extras.accessories && (
            <div className="opt-grid small-grid">
              {accs.map((a) => <button key={a.id} className={cx("opt", acc.some((x) => x.id === a.id) && "on")} onClick={() => setAcc((l) => (l.some((x) => x.id === a.id) ? l.filter((x) => x.id !== a.id) : [...l, a]))}><GarmentPhoto g={optionToGarment(a)} /><span className="opt-name">{a.name}</span></button>)}
            </div>
          )}
          {extras.poses && (
            <div className="chips">
              {POSES.map((p) => <button key={p} className={cx("chip", pose === p && "on")} onClick={() => setPose(pose === p ? undefined : p)}>{p}</button>)}
              <span className="tiny muted" style={{ alignSelf: "center" }}>Poses are applied when you try the outfit on.</span>
            </div>
          )}

          {tips.length > 0 && (
            <div className="advice">
              <span className="eyebrow">Stylist notes{profile.heightCm ? ` · ${profile.heightCm} cm` : ""}</span>
              <ul className="why">{tips.map((t) => <li key={t}>{t}</li>)}</ul>
              {!profile.heightCm && <button className="link-btn" onClick={() => setStep("body")}>Add your height for proportion tips</button>}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
