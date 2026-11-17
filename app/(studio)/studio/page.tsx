"use client";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GarmentEditor from "@/components/GarmentEditor";
import LookCard from "@/components/LookCard";
import StylePanel from "@/components/StylePanel";
import Flat from "@/components/Flat";
import { EngineBadge, Icon } from "@/components/ui";
import { useApp } from "@/lib/store/state";
import { putImage, useImage } from "@/lib/store/images";
import { dominantColor, fileToDataUrl, resizeDataUrl } from "@/lib/image";
import { makeGarment, parseGarmentText, garmentName } from "@/lib/parse";
import { requestLooks } from "@/lib/client";
import { regeneratePiece, type EngineInput } from "@/lib/styling/engine";
import { AESTHETICS, ATTRIBUTE_OPTIONS } from "@/lib/taxonomy";
import type { Garment, GarmentAttributes, Look, Nudge, WardrobeItem } from "@/lib/types";
import { cx, uid } from "@/lib/util";

type Tab = "photo" | "link" | "describe" | "wardrobe" | "aesthetic" | "occasion";

const EXAMPLES = ["Yellow midi skirt", "Oversized black blazer", "White linen shirt", "Blue straight-fit jeans", "Beige trench coat", "Black saree with gold detailing", "Ivory chikankari kurta", "Red silk lehenga"];

const NUDGES: { id: Nudge; label: string }[] = [
  { id: "minimal", label: "More minimal" },
  { id: "experimental", label: "More experimental" },
  { id: "formal", label: "More formal" },
  { id: "casual", label: "More casual" },
  { id: "colourful", label: "More colourful" },
  { id: "elegant", label: "More elegant" },
  { id: "affordable", label: "More affordable" },
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
  work: "Charcoal tailored blazer",
  college: "Blue straight-fit jeans",
  casual: "White linen shirt",
  weekend: "White heavyweight tee",
  "date night": "Black satin slip dress",
  party: "Silver satin midi skirt",
  wedding: "Gold silk saree with zari border",
  festive: "Emerald silk kurta",
  travel: "Navy linen shirt",
  formal: "Black tailored jumpsuit",
  brunch: "Yellow midi skirt",
  interview: "Navy tailored blazer",
};

function Thumb({ g }: { g: Garment }) {
  const src = useImage(g.imageId);
  if (src) return <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  if (g.imageUrl) return <img src={g.imageUrl} alt="" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  return <Flat garment={g} />;
}

function StudioInner() {
  const app = useApp();
  const { status, wardrobe, profile, studio, set, toast, saveLook, rememberShown } = app;
  const router = useRouter();
  const params = useSearchParams();
  const start = params.get("start");
  const initialTab: Tab = start === "aesthetic" ? "aesthetic" : start === "occasion" ? "occasion" : start === "build" ? (wardrobe.length ? "wardrobe" : "describe") : "describe";
  const [tab, setTab] = useState<Tab>(initialTab);
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
  const [panel, setPanel] = useState<{ look?: Look; slot?: string } | null>(null);
  const [engine, setEngine] = useState<"claude" | "rules" | null>(studio.looks?.[0]?.engine ?? null);
  const [notice, setNotice] = useState<string | undefined>();
  const [buildMode] = useState(start === "build");

  const anchor = studio.anchor;
  const looks = studio.looks;
  const photoSrc = useImage(imageId);

  useEffect(() => {
    setTab(initialTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);

  const engineInput: EngineInput | null = useMemo(
    () => (anchor ? { anchor, anchorOwned: studio.anchorOwned, wardrobe, profile, occasion: studio.occasion, nudges } : null),
    [anchor, studio.anchorOwned, wardrobe, profile, studio.occasion, nudges],
  );

  const ready = !!attrs.category;
  const draft = useMemo(() => (attrs.category ? makeGarment({ ...attrs, imageId, imageUrl, name: text.trim() && tab === "describe" ? text.trim().replace(/^./, (c) => c.toUpperCase()) : urlInfo?.title?.slice(0, 70) || undefined }) : null), [attrs, imageId, imageUrl, text, tab, urlInfo]);

  const run = useCallback(
    async (g: Garment, opts?: { nudges?: Nudge[]; occasion?: string; owned?: boolean; panelFirst?: boolean }) => {
      const nn = opts?.nudges ?? nudges;
      const occ = opts?.occasion ?? occasion;
      set({ studio: { anchor: g, anchorOwned: opts?.owned ?? true, looks: studio.anchor?.id === g.id ? studio.looks : undefined, occasion: occ } });
      if (opts?.panelFirst) {
        setPanel({});
      }
      setBusy("Styling…");
      const res = await requestLooks({ anchor: g, anchorOwned: opts?.owned ?? true, nudges: nn, wardrobe, profile, occasion: occ, mode: "explore" });
      setBusy(null);
      setEngine(res.engine);
      setNotice(res.notice);
      set({ studio: { anchor: g, anchorOwned: opts?.owned ?? true, looks: res.looks, occasion: occ } });
      rememberShown(res.looks);
    },
    [nudges, occasion, set, studio.anchor?.id, studio.looks, wardrobe, profile, rememberShown],
  );

  const submit = () => {
    if (!draft) return;
    run({ ...draft, name: draft.name || garmentName(draft) }, { owned: true, panelFirst: buildMode });
  };

  const onDescribe = (v: string) => {
    setText(v);
    const p = parseGarmentText(v);
    setAttrs((a) => ({ ...a, ...p }));
    setImageId(undefined);
    setImageUrl(undefined);
  };

  const onPhoto = async (file?: File) => {
    if (!file) return;
    setBusy("Reading your garment…");
    try {
      const raw = await fileToDataUrl(file);
      const small = await resizeDataUrl(raw, 900, 0.86);
      const id = uid("g_");
      await putImage(id, small);
      setImageId(id);
      setImageUrl(undefined);
      setAiDetected(false);
      const dc = await dominantColor(small);
      setAttrs((a) => ({ ...a, color: dc.name, colorHex: dc.hex }));
      if (status?.claude) {
        setBusy("Recognising garment with AI…");
        const res = await fetch("/api/analyze-garment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: small }) });
        const data = await res.json();
        if (res.ok && data.attributes) {
          setAttrs({ ...data.attributes });
          setText(data.attributes.name ?? "");
          setAiDetected(true);
        } else toast(data.error ?? "Couldn't recognise it — set the details below.");
      }
    } catch {
      toast("That photo couldn't be read.");
    }
    setBusy(null);
  };

  const onUrl = async () => {
    setBusy("Reading product page…");
    setUrlInfo(null);
    try {
      const res = await fetch("/api/product-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.attributes) throw new Error(data.error || "LINK_UNAVAILABLE");
      setAttrs((a) => ({ ...a, ...data.attributes }));
      setImageUrl(data.image);
      setImageId(undefined);
      setUrlInfo({ title: data.title, source: data.source });
      if (!data.attributes.category) toast("Found the product — please choose its category below.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      toast(!msg || msg === "LINK_UNAVAILABLE" || /fetch|network|load/i.test(msg) ? "Reading product links needs MODEO's server, which isn't connected in this demo. Describe the garment instead." : msg);
    }
    setBusy(null);
  };

  const toggleNudge = (n: Nudge) => {
    const next = nudges.includes(n) ? nudges.filter((x) => x !== n) : [...nudges.filter((x) => !(n === "formal" && x === "casual") && !(n === "casual" && x === "formal") && !(n === "minimal" && x === "experimental") && !(n === "experimental" && x === "minimal")), n];
    setNudges(next);
    if (anchor) run(anchor, { nudges: next, owned: studio.anchorOwned });
  };

  const tryOn = (look: Look) => {
    set({ tryOn: { look, variants: looks ?? [look] } });
    router.push("/try-on");
  };

  const regen = (look: Look, slot: string) => {
    if (!engineInput || !looks) return;
    const next = regeneratePiece(look, slot, engineInput, Date.now());
    set({ studio: { ...studio, looks: looks.map((l) => (l.id === look.id ? next : l)) } });
  };

  const save = (look: Look) => {
    saveLook(look);
    toast("Saved to your looks.");
  };

  const pickAesthetic = (a: string) => {
    const p = AESTHETIC_PRESETS[a];
    const g = makeGarment({ ...parseGarmentText(p.text), name: p.text });
    setNudges(p.nudges);
    setAttrs(parseGarmentText(p.text));
    setText(p.text);
    run(g, { nudges: p.nudges, owned: false });
  };

  const pickOccasion = (o: string) => {
    setOccasion(o);
    const owned = wardrobe.filter((w) => w.occasion?.includes(o) && !["footwear", "jewellery", "bag", "accessory"].includes(w.category));
    if (owned.length) {
      const w = owned[Math.floor(Math.random() * owned.length)];
      run(w, { occasion: o, owned: true });
    } else {
      const t = OCCASION_PRESETS[o] ?? "White linen shirt";
      setAttrs(parseGarmentText(t));
      setText(t);
      run(makeGarment({ ...parseGarmentText(t), name: t }), { occasion: o, owned: false });
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">Style Studio</div>
          <h1 className="display h-lg">{buildMode ? <>Build an <em>outfit.</em></> : <>Style a <em>garment.</em></>}</h1>
        </div>
        <p className="lede small" style={{ maxWidth: "40ch", margin: 0 }}>Give MODEO one piece — a photo, a link or a few words — and get four distinct directions, each explained.</p>
      </div>

      <div className="split">
        <section className="panel pad sticky stack" style={{ gap: 18 }}>
          <div className="tabs wrap" role="tablist">
            {([["describe", "Describe"], ["photo", "Photo"], ["link", "Link"], ["wardrobe", "Wardrobe"], ["aesthetic", "Aesthetic"], ["occasion", "Occasion"]] as [Tab, string][]).map(([t, l]) => (
              <button key={t} role="tab" aria-selected={tab === t} className={cx("tab", tab === t && "on")} onClick={() => setTab(t)}>{l}</button>
            ))}
          </div>

          {tab === "describe" && (
            <div className="stack">
              <label className="field">
                <span>Describe the garment</span>
                <input className="input" value={text} placeholder="e.g. Black saree with gold detailing" onChange={(e) => onDescribe(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ready && submit()} />
              </label>
              <div className="chips">{EXAMPLES.map((e) => <button key={e} className="chip" onClick={() => onDescribe(e)}>{e}</button>)}</div>
            </div>
          )}

          {tab === "photo" && (
            <div className="stack">
              <label className="drop" style={{ minHeight: 170 }}>
                <input type="file" accept="image/*" onChange={(e) => onPhoto(e.target.files?.[0])} aria-label="Upload a garment photo" />
                {photoSrc ? <img src={photoSrc} alt="Garment" style={{ maxHeight: 200, objectFit: "contain" }} /> : (
                  <div className="stack-sm" style={{ justifyItems: "center" }}>
                    <Icon name="upload" size={22} />
                    <b style={{ fontWeight: 400 }}>Upload a garment photo</b>
                    <span className="tiny muted">Flat-lay or hanger shots work best</span>
                  </div>
                )}
              </label>
              <p className="tiny muted" style={{ margin: 0 }}>
                {status?.claude
                  ? "The photo is analysed by the AI vision model to detect category, colour, fabric and more. You can correct anything below."
                  : "Colour is detected on your device. Automatic category & fabric recognition needs an AI key (ANTHROPIC_API_KEY) — for now, choose the category below."}
              </p>
              {aiDetected && <span className="tag dark" style={{ justifySelf: "start" }}>AI-detected · please check</span>}
            </div>
          )}

          {tab === "link" && (
            <div className="stack">
              <label className="field">
                <span>Product URL</span>
                <div className="row" style={{ flexWrap: "nowrap", gap: 8 }}>
                  <input className="input" value={url} placeholder="https://store.com/products/…" onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onUrl()} />
                  <button className="btn sm" style={{ height: 44 }} disabled={!url} onClick={onUrl}>Read</button>
                </div>
              </label>
              {urlInfo && (
                <div className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
                  {imageUrl && <img src={imageUrl} alt="" referrerPolicy="no-referrer" style={{ width: 70, height: 90, objectFit: "cover", border: "1px solid var(--line)" }} />}
                  <div className="small"><div className="tiny muted">{urlInfo.source}</div>{urlInfo.title}</div>
                </div>
              )}
              <p className="tiny muted" style={{ margin: 0 }}>MODEO reads the page&apos;s public title and image. Some stores block previews — describe the item instead if so.</p>
            </div>
          )}

          {tab === "wardrobe" && (
            <div className="stack">
              {wardrobe.length === 0 ? (
                <div className="empty"><span className="small">Your wardrobe is empty.</span><button className="btn sm" onClick={() => router.push("/wardrobe")}>Add pieces</button></div>
              ) : (
                <>
                  <span className="small muted">Pick something you own to style.</span>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(78px, 1fr))", gap: 8, maxHeight: 320, overflow: "auto" }}>
                    {wardrobe.map((w) => (
                      <button key={w.id} title={w.name} onClick={() => { setOwnedSource(w); setAttrs(w); setText(w.name); setImageId(w.imageId); }} className="w-item" style={{ outline: ownedSource?.id === w.id ? "1.5px solid var(--ink)" : undefined }}>
                        <div className="img" style={{ aspectRatio: "1" }}><Thumb g={w} /></div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "aesthetic" && (
            <div className="stack">
              <span className="small muted">Choose an aesthetic — MODEO picks a signature piece and styles it four ways.</span>
              <div className="chips">{AESTHETICS.map((a) => <button key={a} className="chip" onClick={() => pickAesthetic(a)}>{a}</button>)}</div>
            </div>
          )}

          {tab === "occasion" && (
            <div className="stack">
              <span className="small muted">Where are you going? MODEO starts from your wardrobe when it can.</span>
              <div className="chips">{ATTRIBUTE_OPTIONS.occasion.map((o) => <button key={o} className={cx("chip", occasion === o && "on")} onClick={() => pickOccasion(o)}>{o}</button>)}</div>
            </div>
          )}

          {!["aesthetic", "occasion"].includes(tab) && (
            <>
              <hr className="rule" />
              {tab === "wardrobe" && ownedSource ? (
                <div className="small muted">Styling <b style={{ color: "var(--ink)", fontWeight: 400 }}>{ownedSource.name}</b> from your wardrobe.</div>
              ) : (
                <GarmentEditor value={attrs} onChange={setAttrs} />
              )}
              <div className="row">
                <button
                  className="btn"
                  disabled={!(tab === "wardrobe" ? ownedSource : ready) || !!busy}
                  onClick={() => (tab === "wardrobe" && ownedSource ? run(ownedSource, { owned: true, panelFirst: buildMode }) : submit())}
                >
                  {busy ?? (buildMode ? "Start building" : "Style it")} <Icon name="arrow" />
                </button>
                {!ready && tab !== "wardrobe" && <span className="tiny muted">Choose a category to continue</span>}
              </div>
            </>
          )}
        </section>

        <section className="stack" style={{ gap: 18, minWidth: 0 }}>
          {!anchor && !busy && (
            <div className="empty" style={{ minHeight: 420, alignContent: "center" }}>
              <div className="display h-md">Four directions, <em>one piece.</em></div>
              <p className="muted small" style={{ maxWidth: "46ch", margin: 0 }}>Minimal &amp; sophisticated · Casual &amp; effortless · Bold &amp; experimental · Contemporary &amp; fashion-forward. Each with a complete outfit, colour story and the reasoning behind it.</p>
            </div>
          )}

          {anchor && (
            <div className="panel pad between" style={{ alignItems: "center" }}>
              <div className="row" style={{ flexWrap: "nowrap" }}>
                <div style={{ width: 54, height: 64, flex: "none", background: "var(--paper-2)" }}><Thumb g={anchor} /></div>
                <div>
                  <div className="eyebrow">Styling</div>
                  <div className="display" style={{ fontSize: 26 }}>{anchor.name}</div>
                  <div className="row" style={{ gap: 10 }}>
                    {engine && <EngineBadge engine={engine} />}
                    {studio.occasion && <span className="tag">For {studio.occasion}</span>}
                  </div>
                </div>
              </div>
              <div className="row">
                <button className="btn ghost sm" onClick={() => setPanel({})}>Play with it</button>
                <button className="btn sm" disabled={!!busy} onClick={() => run(anchor, { owned: studio.anchorOwned })}><Icon name="refresh" size={13} /> Regenerate</button>
              </div>
            </div>
          )}
          {notice && <div className="demo-banner"><span>{notice}</span></div>}

          {anchor && (
            <div className="nudges">
              <span className="eyebrow" style={{ marginRight: 4 }}>Adjust</span>
              {NUDGES.map((n) => <button key={n.id} className={cx("chip", nudges.includes(n.id) && "on")} onClick={() => toggleNudge(n.id)} disabled={!!busy}>{n.label}</button>)}
            </div>
          )}

          {busy && !looks && (
            <div className="looks">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 520 }} />)}</div>
          )}

          {looks && (
            <div className="looks" style={{ opacity: busy ? 0.5 : 1, transition: "opacity .3s" }}>
              {looks.map((l, i) => (
                <LookCard key={l.id} look={l} index={i} onTryOn={tryOn} onOpenPanel={(look, slot) => setPanel({ look, slot })} onRegenPiece={regen} onSave={save} />
              ))}
            </div>
          )}
        </section>
      </div>

      {engineInput && (
        <StylePanel open={!!panel} onClose={() => setPanel(null)} input={engineInput} initialLook={panel?.look} focusSlot={panel?.slot} onTryOn={(l) => { setPanel(null); tryOn(l); }} />
      )}
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={null}>
      <StudioInner />
    </Suspense>
  );
}
