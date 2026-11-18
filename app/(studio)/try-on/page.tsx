"use client";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import GarmentPhoto from "@/components/GarmentPhoto";
import PhotoSetup from "@/components/PhotoSetup";
import { Icon, Modal } from "@/components/ui";
import { useApp } from "@/lib/store/state";
import { getImage, putImage, useImage } from "@/lib/store/images";
import { genImageId, getGarmentImage } from "@/lib/garmentImage";
import { productPrompt } from "@/lib/stylist";
import { lookDescription } from "@/lib/styling/engine";
import { downloadDataUrl, resizeDataUrl } from "@/lib/image";
import type { Look, Piece } from "@/lib/types";
import { cx, uid } from "@/lib/util";
import { roleOf } from "@/lib/taxonomy";

type Phase = "idle" | "working" | "done" | "error" | "demo";
const WEARABLE = ["bottom", "drape", "onepiece", "top", "layer"]; // dressing order

function Compare({ before, after }: { before: string; after: string }) {
  const [x, setX] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const move = (cx: number) => { const r = ref.current?.getBoundingClientRect(); if (r) setX(Math.max(0, Math.min(100, ((cx - r.left) / r.width) * 100))); };
  return (
    <div ref={ref} className="compare" role="slider" aria-label="Compare before and after" aria-valuenow={Math.round(x)} tabIndex={0}
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); move(e.clientX); }} onPointerMove={(e) => e.buttons && move(e.clientX)}
      onKeyDown={(e) => { if (e.key === "ArrowLeft") setX((v) => Math.max(0, v - 5)); if (e.key === "ArrowRight") setX((v) => Math.min(100, v + 5)); }}>
      <img src={before} alt="Before" />
      <div className="after" style={{ clipPath: `inset(0 0 0 ${x}%)` }}><img src={after} alt="Try-on result" /></div>
      <div className="handle" style={{ left: `${x}%` }} />
      <span className="lbl" style={{ left: 14 }}>Before</span><span className="lbl" style={{ right: 14 }}>After</span>
    </div>
  );
}

async function garmentImageFor(p: Piece): Promise<string | undefined> {
  if (p.garment.imageId) return getImage(p.garment.imageId);
  if (p.garment.imageUrl?.startsWith("https://")) return p.garment.imageUrl;
  const prompt = productPrompt({ ...p.garment, shadeHex: p.garment.colorHex });
  return (await getImage(genImageId(prompt))) ?? (await getGarmentImage(prompt)) ?? undefined;
}

function FittingRoom() {
  const { photo, setPhoto, tryOn, status, saveLook, saved, toast } = useApp();
  const params = useSearchParams();
  const pose = params.get("pose") ?? undefined;
  const person = useImage(photo?.imageId);
  const [look, setLook] = useState<Look | null>(tryOn?.look ?? saved[0]?.look ?? null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compare, setCompare] = useState(true);
  const [photoModal, setPhotoModal] = useState(false);
  const cancelled = useRef(false);
  const live = !!status?.tryOn;
  const others = [...(tryOn?.variants ?? []), ...saved.map((s) => s.look)].filter((l, i, a) => a.findIndex((x) => x.id === l.id) === i).slice(0, 8);

  useEffect(() => () => { cancelled.current = true; }, []);
  useEffect(() => { if (tryOn?.look) setLook(tryOn.look); }, [tryOn?.look]);

  const runJob = async (body: object): Promise<string> => {
    const res = await fetch("/api/try-on", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Try-on failed");
    if (data.mode !== "live") throw new Error(data.reason ?? "Try-on is not available");
    const started = Date.now();
    while (!cancelled.current && Date.now() - started < 180_000) {
      await new Promise((r) => setTimeout(r, 2500));
      const p = await fetch(`/api/try-on/${encodeURIComponent(data.jobId)}`).then((r) => r.json());
      if (p.status === "completed" && p.image) return p.image;
      if (p.status === "failed") throw new Error(p.error ?? "Generation failed");
    }
    throw new Error("The try-on service took too long.");
  };

  const generate = async () => {
    if (!look) return;
    if (!person || !photo) { setPhotoModal(true); return; }
    if (!photo.consentProcessing) { toast("Allow processing in Profile first"); return; }
    setResult(null); setError(null);
    if (!live) { setPhase("demo"); return; }
    setPhase("working");
    try {
      let current = await resizeDataUrl(person, 1024, 0.9);
      const wearables = look.pieces.filter((p) => WEARABLE.includes(roleOf(p.garment.category))).sort((a, b) => WEARABLE.indexOf(roleOf(a.garment.category)) - WEARABLE.indexOf(roleOf(b.garment.category)));
      const description = lookDescription({ ...look, pieces: look.pieces.filter((p) => !["jewellery", "bag", "accessory"].includes(p.role)) });
      if (status?.tryOnProviders.fashn) {
        // garment-image try-on, one garment at a time on the person's own photo
        for (const [i, p] of wearables.entries()) {
          setProgress(`${i + 1} / ${wearables.length} · ${p.garment.name}`);
          const img = await garmentImageFor(p);
          if (!img) continue;
          const r = roleOf(p.garment.category);
          current = await runJob({ consent: true, personImage: await resizeDataUrl(current, 1024, 0.9), garmentImage: img, garmentCategory: r === "top" || r === "layer" ? "tops" : r === "bottom" ? "bottoms" : "one-pieces", outfitDescription: description, pose });
        }
      } else {
        setProgress("Dressing you");
        current = await runJob({ consent: true, personImage: current, outfitDescription: description, pose });
      }
      setResult(current); setPhase("done");
    } catch (e) {
      setPhase("error"); setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const save = async () => {
    if (!look) return;
    let tryOnImageId: string | undefined;
    if (result) { tryOnImageId = uid("try_"); await putImage(tryOnImageId, result); }
    saveLook({ ...look, id: look.id + "_" + Date.now().toString(36) }, { tryOnImageId });
    toast("Saved");
  };

  const clothes = look?.pieces.filter((p) => !["jewellery", "bag", "accessory"].includes(p.role)) ?? [];

  return (
    <main className="fitting fade-in">
      <section className="fit-stage">
        <div className="stage">
          {phase === "done" && result && person && compare ? <Compare before={person} after={result} />
            : phase === "done" && result ? <img src={result} alt="Try-on result" />
            : person ? <img src={person} alt="Your photo" />
            : <div className="stage-empty"><div className="stack" style={{ justifyItems: "center" }}><button className="btn" onClick={() => setPhotoModal(true)}>Add your photo</button><span className="eyebrow">Optional</span></div></div>}
          {phase === "working" && <div className="loader"><div><div className="eyebrow">{progress}</div><div className="bar" /></div></div>}
          {phase === "demo" && person && (
            <div className="demo-veil">
              <b>Demo</b>
              <span>Virtual try-on isn&apos;t connected, so no image has been generated. MY GALA never fakes a try-on by placing clothes over your photo.</span>
            </div>
          )}
        </div>
      </section>

      <aside className="fit-side">
        <h1 className="display h-md">Fitting Room</h1>
        {!live && (
          <div className="demo-banner">
            <b>Demo mode</b>
            <span>Real try-on needs a try-on service (FASHN or Replicate) on the server. When connected, your selected garments are fitted onto your photo while keeping your face, proportions, skin tone{pose ? "" : " and pose"}. Results are approximate.</span>
          </div>
        )}
        {phase === "error" && <div className="demo-banner"><b>Try-on failed</b><span>{error}</span></div>}

        <div className="stack-sm">
          <span className="eyebrow">Photo</span>
          <div className="row">
            <button className="btn ghost sm" onClick={() => setPhotoModal(true)}><Icon name="camera" size={13} /> {photo ? "Replace" : "Upload"}</button>
            {photo && <button className="btn ghost sm" onClick={async () => { await setPhoto(null); setResult(null); setPhase("idle"); toast("Photo deleted"); }}><Icon name="trash" size={13} /> Delete</button>}
          </div>
          <span className="tiny muted">Stays on this device. Sent only when you press Try on.</span>
        </div>

        {look ? (
          <div className="stack-sm">
            <span className="eyebrow">Outfit{pose ? ` · pose: ${pose}` : ""}</span>
            <div className="fit-pieces">{clothes.map((p) => <GarmentPhoto key={p.slot} g={p.garment} />)}</div>
            <div className="row">
              <button className="btn" onClick={generate} disabled={phase === "working"}><Icon name="mirror" size={14} /> {phase === "done" ? "Again" : person ? "Try on" : "Add photo"}</button>
              {phase === "done" && result && (
                <>
                  <button className="icon-btn" style={{ width: 44, height: 44 }} aria-label="Toggle comparison" onClick={() => setCompare((v) => !v)}><Icon name="compare" /></button>
                  <button className="icon-btn" style={{ width: 44, height: 44 }} aria-label="Download" onClick={() => downloadDataUrl(result, "my-gala-try-on.png")}><Icon name="download" /></button>
                </>
              )}
              <button className="icon-btn" style={{ width: 44, height: 44 }} aria-label="Save" onClick={save}><Icon name="heart" /></button>
            </div>
          </div>
        ) : (
          <div className="row"><Link href="/studio" className="btn sm">Start your edit</Link></div>
        )}

        {others.length > 1 && (
          <div className="stack-sm">
            <span className="eyebrow">Other outfits</span>
            <div className="variants">
              {others.map((v) => (
                <button key={v.id} className={cx("variant", v.id === look?.id && "on")} onClick={() => { setLook(v); setResult(null); setPhase("idle"); }} aria-label={v.title}>
                  <div className="mini"><GarmentPhoto g={v.pieces[0].garment} /></div>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      <Modal open={photoModal} onClose={() => setPhotoModal(false)}>
        <div className="between" style={{ marginBottom: 16 }}><h2 className="display h-sm" style={{ margin: 0 }}>Your photo</h2><button className="icon-btn" aria-label="Close" onClick={() => setPhotoModal(false)}><Icon name="close" /></button></div>
        <PhotoSetup submitLabel="Save photo" onComplete={() => { setPhotoModal(false); setResult(null); setPhase("idle"); }} />
      </Modal>
    </main>
  );
}

export default function Page() {
  return <Suspense fallback={null}><FittingRoom /></Suspense>;
}
