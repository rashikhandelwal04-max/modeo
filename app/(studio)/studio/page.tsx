"use client";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GarmentEditor from "@/components/GarmentEditor";
import LookBoard from "@/components/LookBoard";
import Suggestions from "@/components/Suggestions";
import Flat from "@/components/Flat";
import { EngineBadge, Icon } from "@/components/ui";
import { useApp } from "@/lib/store/state";
import { putImage, useImage } from "@/lib/store/images";
import { dominantColor, fileToDataUrl, resizeDataUrl } from "@/lib/image";
import { makeGarment, parseGarmentText, garmentName } from "@/lib/parse";
import { requestLooks } from "@/lib/client";
import { regeneratePiece, type EngineInput } from "@/lib/styling/engine";
import { AESTHETICS, ATTRIBUTE_OPTIONS, roleOf } from "@/lib/taxonomy";
import type { Direction, Garment, GarmentAttributes, Look, Nudge, WardrobeItem } from "@/lib/types";

const SHORT: Record<Direction, string> = { minimal: "Minimal", casual: "Easy", bold: "Bold", contemporary: "Modern" };
import { cx, uid } from "@/lib/util";

type Tab = "describe" | "upload" | "wardrobe" | "link" | "aesthetic" | "occasion";

const EXAMPLES = ["Black blazer", "Gold saree", "Yellow midi skirt", "White linen shirt", "Red lehenga"];
const NUDGES: { id: Nudge; label: string }[] = [
  { id: "minimal", label: "Minimal" }, { id: "experimental", label: "Experimental" }, { id: "formal", label: "Formal" },
  { id: "casual", label: "Casual" }, { id: "colourful", label: "Colourful" }, { id: "elegant", label: "Elegant" }, { id: "affordable", label: "Affordable" },
];
const AESTHETIC_PRESETS: Record<string, { text: string; nudges: Nudge[] }> = {
  Minimalist: { text: "Black wide-leg trousers", nudges: ["minimal"] },
  "Old money": { text: "Ivory cable-knit sweater", nudges: ["elegant"] },
  Streetwear: { text: "Oversized graphic tee", nudges: ["experimental", "casual"] },
  "Quiet luxury": { text: "Camel cashmere coat", nudges: ["minimal", "elegant"] },
  "Casual chic": { text: "White linen shirt", nudges: ["casual"] },
  Contemporary: { text: "Grey satin bias-cut midi skirt", nudges: [] },
  Bohemian: { text: "Rust floral maxi dress", nudges: ["colourful", "casual"] },
  Classic: { text: "Beige trench coat", nudges: ["elegant"] },
  Formal: { text: "Navy tailored blazer", nudges: ["formal"] },
  Experimental: { text: "Fuchsia satin corset top", nudges: ["experimental", "colourful"] },
  "Indian contemporary": { text: "Ivory chikankari kurta", nudges: ["experimental"] },
};
const OCCASION_PRESETS: Record<string, string> = {
  work: "Charcoal tailored blazer", college: "Blue straight-fit jeans", casual: "White linen shirt", weekend: "White heavyweight tee",
  "date night": "Black satin slip dress", party: "Silver satin midi skirt", wedding: "Gold silk saree with zari border", festive: "Emerald silk kurta",
  travel: "Navy linen shirt", formal: "Black tailored jumpsuit", brunch: "Yellow midi skirt", interview: "Navy tailored blazer",
};

function Thumb({ g }: { g: Garment }) {
  const src = useImage(g.imageId);
  if (src) return <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  if (g.imageUrl) return <img src={g.imageUrl} alt="" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  return <Flat garment={g} />;
}

function StudioInner() {
  const { status, wardrobe, profile, studio, set, toast, saveLook, rememberShown, photo } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const start = params.get("start");
  const [tab, setTab] = useState<Tab>(start === "aesthetic" ? "aesthetic" : start === "occasion" ? "occasion" : start === "build" && wardrobe.length ? "wardrobe" : "describe");
  const [text, setText] = useState("");
  const [attrs, setAttrs] = useState<Partial<GarmentAttributes>>({});
  const [imageId, setImageId] = useState<string | undefined>();
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [aiDetected, setAiDetected] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [urlInfo, setUrlInfo] = useState<{ title: string; source: string } | null>(null);
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [occasion, setOccasion] = useState<string | undefined>(studio.occasion);
  const [ownedSource, setOwnedSource] = useState<WardrobeItem | null>(null);
  const [engine, setEngine] = useState<"claude" | "rules" | null>(studio.looks?.[0]?.engine ?? null);
  const [notice, setNotice] = useState<string | undefined>();
  const [sel, setSel] = useState(0);
  const [focus, setFocus] = useState<string | undefined>();
  const photoSrc = useImage(imageId);

  const anchor = studio.anchor;
  const looks = studio.looks;
  const look = looks?.[Math.min(sel, (looks?.length ?? 1) - 1)];

  useEffect(() => { if (start === "aesthetic") setTab("aesthetic"); if (start === "occasion") setTab("occasion"); }, [start]);

  const engineInput: EngineInput | null = useMemo(
    () => (anchor ? { anchor, anchorOwned: studio.anchorOwned, wardrobe, profile, occasion: studio.occasion, nudges } : null),
    [anchor, studio.anchorOwned, wardrobe, profile, studio.occasion, nudges],
  );
  const ready = !!attrs.category;
  const draft = useMemo(() => (attrs.category ? makeGarment({ ...attrs, imageId, imageUrl, name: text.trim() && tab === "describe" ? text.trim().replace(/^./, (c) => c.toUpperCase()) : urlInfo?.title?.slice(0, 70) || undefined }) : null), [attrs, imageId, imageUrl, text, tab, urlInfo]);

  const run = useCallback(async (g: Garment, opts?: { nudges?: Nudge[]; occasion?: string; owned?: boolean }) => {
    const nn = opts?.nudges ?? nudges;
    const occ = opts?.occasion ?? occasion;
    set({ studio: { anchor: g, anchorOwned: opts?.owned ?? true, looks: studio.anchor?.id === g.id ? studio.looks : undefined, occasion: occ } });
    setBusy("Styling…");
    const res = await requestLooks({ anchor: g, anchorOwned: opts?.owned ?? true, nudges: nn, wardrobe, profile, occasion: occ, mode: "explore" });
    setBusy(null);
    setEngine(res.engine);
    setNotice(res.notice);
    setSel(0);
    setFocus(undefined);
    set({ studio: { anchor: g, anchorOwned: opts?.owned ?? true, looks: res.looks, occasion: occ } });
    rememberShown(res.looks);
  }, [nudges, occasion, set, studio.anchor?.id, studio.looks, wardrobe, profile, rememberShown]);

  const updateLook = (l: Look) => looks && set({ studio: { ...studio, looks: looks.map((x, i) => (i === sel ? l : x)) } });
  const onDescribe = (v: string) => { setText(v); setAttrs((a) => ({ ...a, ...parseGarmentText(v) })); setImageId(undefined); setImageUrl(undefined); setOwnedSource(null); };

  const onPhoto = async (file?: File) => {
    if (!file) return;
    setBusy("Reading your garment…");
    try {
      const small = await resizeDataUrl(await fileToDataUrl(file), 900, 0.86);
      const id = uid("g_");
      await putImage(id, small);
      setImageId(id); setImageUrl(undefined); setAiDetected(false); setOwnedSource(null);
      const dc = await dominantColor(small);
      setAttrs((a) => ({ ...a, color: dc.name, colorHex: dc.hex }));
      if (status?.claude) {
        setBusy("Recognising with AI…");
        const res = await fetch("/api/analyze-garment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: small }) });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.attributes) { setAttrs({ ...data.attributes }); setText(data.attributes.name ?? ""); setAiDetected(true); }
        else toast(data.error ?? "Couldn't recognise it — set the details below.");
      }
    } catch { toast("That photo couldn't be read."); }
    setBusy(null);
  };

  const onUrl = async () => {
    setBusy("Reading product page…");
    setUrlInfo(null);
    try {
      const res = await fetch("/api/product-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.attributes) throw new Error(data.error || "LINK_UNAVAILABLE");
      setAttrs((a) => ({ ...a, ...data.attributes })); setImageUrl(data.image); setImageId(undefined); setUrlInfo({ title: data.title, source: data.source });
      if (!data.attributes.category) toast("Found it — please choose the category below.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      toast(!msg || msg === "LINK_UNAVAILABLE" || /fetch|network|load/i.test(msg) ? "Reading product links needs the MY GALA server. Describe the garment instead." : msg);
    }
    setBusy(null);
  };

  const toggleNudge = (n: Nudge) => {
    const opposite: Partial<Record<Nudge, Nudge>> = { formal: "casual", casual: "formal", minimal: "experimental", experimental: "minimal" };
    const next = nudges.includes(n) ? nudges.filter((x) => x !== n) : [...nudges.filter((x) => x !== opposite[n]), n];
    setNudges(next);
    if (anchor) run(anchor, { nudges: next, owned: studio.anchorOwned });
  };
  const tryOn = (l: Look) => { set({ tryOn: { look: l, variants: looks ?? [l] } }); router.push("/try-on"); };

  const pickAesthetic = (a: string) => {
    const p = AESTHETIC_PRESETS[a];
    setNudges(p.nudges); setAttrs(parseGarmentText(p.text)); setText(p.text);
    run(makeGarment({ ...parseGarmentText(p.text), name: p.text }), { nudges: p.nudges, owned: false });
  };
  const pickOccasion = (o: string) => {
    setOccasion(o);
    const own = wardrobe.filter((w) => w.occasion?.includes(o) && !["footwear", "jewellery", "bag", "accessory"].includes(roleOf(w.category)));
    if (own.length) run(own[Math.floor(Math.random() * own.length)], { occasion: o, owned: true });
    else { const t = OCCASION_PRESETS[o] ?? "White linen shirt"; setAttrs(parseGarmentText(t)); setText(t); run(makeGarment({ ...parseGarmentText(t), name: t }), { occasion: o, owned: false }); }
  };

  const tabs: [Tab, string][] = [["describe", "Describe"], ["upload", "Upload"], ["wardrobe", "Wardrobe"], ["link", "Link"], ["aesthetic", "Aesthetic"], ["occasion", "Occasion"]];

  return (
    <main className="studio">
      {/* ---------- 1. SOURCE ---------- */}
      <section className="st-source" aria-label="Choose a garment">
        <h1 className="display h-md">Studio</h1>
        <div className="tabs wrap" role="tablist">
          {tabs.map(([t, l]) => <button key={t} role="tab" aria-selected={tab === t} className={cx("tab", tab === t && "on")} onClick={() => setTab(t)}>{l}</button>)}
        </div>

        {tab === "describe" && (
          <div className="stack">
            <input className="input underline" value={text} placeholder="Black blazer, gold saree…" aria-label="Describe the garment" onChange={(e) => onDescribe(e.target.value)} onKeyDown={(e) => e.key === "Enter" && draft && run(draft)} />
            <div className="chips">{EXAMPLES.map((e) => <button key={e} className="chip" onClick={() => onDescribe(e)}>{e}</button>)}</div>
          </div>
        )}
        {tab === "upload" && (
          <div className="stack">
            <label className="drop" style={{ minHeight: 160 }}>
              <input type="file" accept="image/*" onChange={(e) => onPhoto(e.target.files?.[0])} aria-label="Upload a clothing image" />
              {photoSrc ? <img src={photoSrc} alt="Garment" style={{ maxHeight: 180, objectFit: "contain" }} /> : (
                <div className="stack-sm" style={{ justifyItems: "center" }}><Icon name="upload" size={20} /><span className="eyebrow">Upload</span></div>
              )}
            </label>
            {aiDetected && <span className="tag dark" style={{ justifySelf: "start" }}>AI-detected · please check</span>}
          </div>
        )}
        {tab === "wardrobe" && (wardrobe.length === 0 ? (
          <div className="empty"><span className="small">Your wardrobe is empty.</span><button className="btn sm" onClick={() => router.push("/wardrobe")}>Open My Wardrobe</button></div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: 6 }}>
            {wardrobe.map((w) => (
              <button key={w.id} title={w.name} onClick={() => { setOwnedSource(w); setAttrs(w); setText(w.name); setImageId(w.imageId); }} className="w-item plain" style={{ outline: ownedSource?.id === w.id ? "2px solid var(--ink)" : undefined }}>
                <div className="img" style={{ aspectRatio: "1" }}><Thumb g={w} /></div>
              </button>
            ))}
          </div>
        ))}
        {tab === "link" && (
          <div className="stack">
            <div className="row" style={{ flexWrap: "nowrap", gap: 8 }}>
              <input className="input" value={url} placeholder="https://store.com/products/…" aria-label="Product URL" onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onUrl()} />
              <button className="btn sm" style={{ height: 44 }} disabled={!url} onClick={onUrl}>Read</button>
            </div>
            {urlInfo && <div className="small"><span className="tiny muted">{urlInfo.source}</span><br />{urlInfo.title}</div>}
          </div>
        )}
        {tab === "aesthetic" && <div className="chips">{AESTHETICS.map((a) => <button key={a} className="chip" onClick={() => pickAesthetic(a)}>{a}</button>)}</div>}
        {tab === "occasion" && <div className="chips">{ATTRIBUTE_OPTIONS.occasion.map((o) => <button key={o} className={cx("chip", occasion === o && "on")} onClick={() => pickOccasion(o)}>{o}</button>)}</div>}

        {!["aesthetic", "occasion"].includes(tab) && (
          <>
            {tab === "wardrobe" && ownedSource ? <span className="small">{ownedSource.name}</span> : (
              <details open={tab === "upload" || !!attrs.category}>
                <summary className="eyebrow" style={{ cursor: "pointer", marginBottom: 12 }}>Details +</summary>
                <GarmentEditor value={attrs} onChange={setAttrs} />
              </details>
            )}
            <button className="btn block" disabled={!(tab === "wardrobe" ? ownedSource : ready) || !!busy} onClick={() => (tab === "wardrobe" && ownedSource ? run(ownedSource, { owned: true }) : draft && run({ ...draft, name: draft.name || garmentName(draft) }))}>
              {busy ?? "Style it"} <Icon name="arrow" />
            </button>
          </>
        )}
      </section>

      {/* ---------- 2. CANVAS ---------- */}
      <section className="st-canvas" aria-label="Outfit canvas">
        {!look ? (
          <div className="st-empty">
            {busy ? <span className="spin" /> : <span className="eyebrow">Start with one piece</span>}
          </div>
        ) : (
          <>
            <div className="st-canvas-head">
              <div className="row" style={{ flexWrap: "nowrap" }}>
                <div style={{ width: 44, height: 54, flex: "none", background: "var(--paper)" }}>{anchor && <Thumb g={anchor} />}</div>
                <div style={{ minWidth: 0 }}>
                  <h2 className="display h-sm">{anchor?.name}</h2>
                  <span className="eyebrow">{SHORT[look.direction]}</span>
                </div>
              </div>
              <div className="row">
                {engine && <EngineBadge engine={engine} />}
                <button className="btn ghost sm" onClick={() => { saveLook({ ...look, id: look.id + "_" + Date.now().toString(36) }); toast("Added to My Collection."); }}><Icon name="heart" size={13} /> Save</button>
                <button className="btn sm" onClick={() => tryOn(look)}><Icon name="mirror" size={13} /> Try on</button>
              </div>
            </div>
            {notice && <div className="demo-banner" style={{ margin: "10px 22px 0" }}><span>{notice}</span></div>}
            <LookBoard key={look.id} pieces={look.pieces} annotations={look.annotations} activeSlot={focus} onPieceClick={(p) => setFocus(p.slot)} />
            <div className="st-tools">
              <div className="nudges">{NUDGES.map((n) => <button key={n.id} className={cx("chip", nudges.includes(n.id) && "on")} onClick={() => toggleNudge(n.id)} disabled={!!busy}>{n.label}</button>)}</div>
              <button className="link-btn" disabled={!!busy} onClick={() => anchor && run(anchor, { owned: studio.anchorOwned })}>{busy ?? "Refresh"}</button>
            </div>
            <div className="st-film" role="tablist" aria-label="Looks">
              {looks!.map((l, i) => (
                <button key={l.id} role="tab" aria-selected={i === sel} className={cx(i === sel && "on")} onClick={() => { setSel(i); setFocus(undefined); }}>
                  <div className="mini"><LookBoard pieces={l.pieces} compact /></div>
                  <b>{SHORT[l.direction]}</b>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ---------- 3. CONTEXTUAL SUGGESTIONS ---------- */}
      <section className="st-suggest" aria-label="Styling suggestions">
        {look && engineInput && anchor ? (
          <>
            <h2 className="display h-sm" style={{ marginBottom: 6 }}>Style it</h2>
            <details className="why-toggle" style={{ marginBottom: 6 }}>
              <summary>Why it works +</summary>
              <ul className="why small">{look.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
              {look.notes && <div className="hand-notes" style={{ marginTop: 8 }}>{look.notes.map((n) => <span key={n}>{n}</span>)}</div>}
            </details>
            <div className="opt-group">
              <div className="eyebrow">This look</div>
              <div className="stack-sm">
                {look.pieces.map((p) => (
                  <div key={p.slot} className="row" style={{ flexWrap: "nowrap", gap: 8, justifyContent: "space-between" }}>
                    <button className="small" style={{ background: "none", border: 0, padding: 0, textAlign: "left", cursor: "pointer", textDecoration: focus === p.slot ? "underline" : undefined }} onClick={() => setFocus(p.slot)}>
                      <span className="sw" style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: p.garment.colorHex, marginRight: 8, border: "1px solid rgba(0,0,0,.15)" }} />{p.garment.name}
                    </button>
                    <span className="row" style={{ gap: 4, flexWrap: "nowrap" }}>
                      {!p.anchor && (p.owned ? <span className="tag owned">Owned</span> : <span className="tag suggested">Suggested</span>)}
                      {!p.anchor && <button className="icon-btn" style={{ width: 26, height: 26 }} title="Swap this piece only" aria-label={`Swap ${p.garment.name}`} onClick={() => updateLook(regeneratePiece(look, p.slot, engineInput, Date.now()))}><Icon name="refresh" size={12} /></button>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <Suggestions look={look} input={engineInput} onChange={updateLook} focus={focus} onFocus={setFocus} />
          </>
        ) : (
          <h2 className="display h-sm" style={{ color: "var(--grey)" }}>Style it</h2>
        )}
      </section>
    </main>
  );
}

export default function StudioPage() {
  return <Suspense fallback={null}><StudioInner /></Suspense>;
}
