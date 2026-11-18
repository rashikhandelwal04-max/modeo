"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import LookBoard from "@/components/LookBoard";
import PhotoSetup from "@/components/PhotoSetup";
import { Icon, Modal } from "@/components/ui";
import { useApp } from "@/lib/store/state";
import { getImage, putImage, useImage } from "@/lib/store/images";
import { DIRECTION_LABEL, lookDescription } from "@/lib/styling/engine";
import { downloadDataUrl, resizeDataUrl } from "@/lib/image";
import type { Look } from "@/lib/types";
import { cx, uid } from "@/lib/util";
import { roleOf } from "@/lib/taxonomy";

type Phase = "idle" | "starting" | "processing" | "done" | "error" | "demo" | "unsupported";

function Compare({ before, after }: { before: string; after: string }) {
  const [x, setX] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const move = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setX(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };
  return (
    <div ref={ref} className="compare" role="slider" aria-label="Compare original and generated" aria-valuenow={Math.round(x)} tabIndex={0}
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); move(e.clientX); }}
      onPointerMove={(e) => e.buttons && move(e.clientX)}
      onKeyDown={(e) => { if (e.key === "ArrowLeft") setX((v) => Math.max(0, v - 5)); if (e.key === "ArrowRight") setX((v) => Math.min(100, v + 5)); }}>
      <img src={before} alt="Original photograph" />
      <div className="after" style={{ clipPath: `inset(0 0 0 ${x}%)` }}><img src={after} alt="Generated try-on" /></div>
      <div className="handle" style={{ left: `${x}%` }} />
      <span className="lbl" style={{ left: 14 }}>Before</span>
      <span className="lbl" style={{ right: 14 }}>AI try-on</span>
    </div>
  );
}

function primaryGarment(look: Look) {
  const withImg = look.pieces.filter((p) => (p.garment.imageId || p.garment.imageUrl) && ["top", "bottom", "onepiece", "layer", "drape"].includes(roleOf(p.garment.category)));
  return withImg.find((p) => p.anchor) ?? withImg[0];
}

export default function FittingRoom() {
  const { photo, setPhoto, tryOn, set, status, saveLook, saved, toast } = useApp();
  const person = useImage(photo?.imageId);
  const [look, setLook] = useState<Look | null>(tryOn?.look ?? saved[0]?.look ?? null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [providerLabel, setProviderLabel] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(true);
  const [photoModal, setPhotoModal] = useState(false);
  const cancelled = useRef(false);
  const variants = tryOn?.variants?.length ? tryOn.variants : saved.slice(0, 6).map((s) => s.look);
  const live = !!status?.tryOn;

  useEffect(() => () => { cancelled.current = true; }, []);
  useEffect(() => { if (tryOn?.look) setLook(tryOn.look); }, [tryOn?.look]);

  const generate = async (l: Look) => {
    if (!person || !photo) { setPhotoModal(true); return; }
    if (!photo.consentProcessing) { toast("Turn on processing consent in My Profile first."); return; }
    setResult(null); setError(null); setReason(null);
    if (!live) { setPhase("demo"); setReason("No virtual try-on provider is connected, so nothing was sent anywhere."); return; }
    setPhase("starting");
    try {
      const personImage = await resizeDataUrl(person, 1024, 0.9);
      const g = primaryGarment(l);
      let garmentImage: string | undefined;
      if (g?.garment.imageId) garmentImage = await getImage(g.garment.imageId);
      else if (g?.garment.imageUrl?.startsWith("https://")) garmentImage = g.garment.imageUrl;
      const role = g ? roleOf(g.garment.category) : undefined;
      const res = await fetch("/api/try-on", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true, personImage, garmentImage, garmentCategory: role === "top" || role === "layer" ? "tops" : role === "bottom" ? "bottoms" : role ? "one-pieces" : "auto", outfitDescription: lookDescription(l) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Try-on failed");
      if (data.mode === "demo") { setPhase("demo"); setReason(data.reason); return; }
      if (data.mode === "unsupported") { setPhase("unsupported"); setReason(data.reason); return; }
      setProviderLabel(data.providerLabel);
      setPhase("processing");
      const started = Date.now();
      while (!cancelled.current && Date.now() - started < 180_000) {
        await new Promise((r) => setTimeout(r, 2500));
        const p = await fetch(`/api/try-on/${encodeURIComponent(data.jobId)}`).then((r) => r.json());
        if (p.status === "completed" && p.image) { setResult(p.image); setPhase("done"); return; }
        if (p.status === "failed") throw new Error(p.error ?? "Generation failed");
      }
      if (!cancelled.current) throw new Error("The try-on service took too long. Please try again.");
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const pick = (v: Look) => { setLook(v); setResult(null); setPhase("idle"); set({ tryOn: { look: v, variants } }); };
  const saveResult = async () => {
    if (!look) return;
    let tryOnImageId: string | undefined;
    if (result) { tryOnImageId = uid("try_"); await putImage(tryOnImageId, result); }
    saveLook({ ...look, id: look.id + "_" + Date.now().toString(36) }, { tryOnImageId });
    toast(result ? "Saved with your try-on to My Collection." : "Added to My Collection.");
  };

  return (
    <main className="fitting fade-in">
      <section className="fit-stage" aria-label="Stage">
        <div className="curtain" />
        <div className="stage">
          {phase === "done" && result && person && showCompare ? <Compare before={person} after={result} />
            : phase === "done" && result ? <img src={result} alt="Generated try-on" />
            : person ? <img src={person} alt="Your photograph" />
            : (
              <div className="stage-empty">
                <div className="stack" style={{ justifyItems: "center" }}>
                  <span className="eyebrow" style={{ color: "#9a9a9a" }}>Optional</span>
                  <p className="mega" style={{ fontSize: "clamp(40px, 5vw, 72px)", margin: 0 }}>Step on<br /><em style={{ textTransform: "none" }}>stage.</em></p>
                  <p className="small" style={{ maxWidth: "34ch", color: "#bbb", margin: 0 }}>Add a full-length photo to preview looks on yourself. Without one, you can still explore and save every look.</p>
                  <button className="btn light" onClick={() => setPhotoModal(true)}>Add my photo</button>
                </div>
              </div>
            )}
          {(phase === "starting" || phase === "processing") && (
            <div className="loader"><div><div className="eyebrow" style={{ color: "#ddd" }}>{phase === "starting" ? "Preparing" : `Generating with ${providerLabel}`}</div><div className="display h-sm" style={{ marginTop: 8 }}>Dressing you in {look?.title}</div><div className="bar" /></div></div>
          )}
          {person && phase !== "done" && <span className="lbl" style={{ left: 14 }}>Your photograph · original</span>}
        </div>
      </section>

      <aside className="fit-side">
        <div>
          <span className="eyebrow">MY GALA</span>
          <h1 className="display h-lg" style={{ margin: "6px 0 0" }}>The Fitting <em>Room.</em></h1>
        </div>
        <div className="row">
          {live ? <span className="tag dark">Provider · {status?.tryOn === "fashn" ? "FASHN" : "Replicate"}</span> : <span className="tag warn">Demo mode · no try-on provider connected</span>}
        </div>

        {(phase === "demo" || (!live && phase === "idle")) && (
          <div className="demo-banner">
            <b>Demo mode</b>
            <span>No try-on image is generated in demo mode. MY GALA never fakes a try-on by laying clothes over your photo. Real try-on uses a specialised service (FASHN or Replicate) that is told to keep your face, body proportions, skin tone and pose.</span>
            {reason && phase === "demo" && <span className="tiny">{reason}</span>}
          </div>
        )}
        {phase === "unsupported" && <div className="demo-banner"><b>Needs a garment photo</b><span>{reason}</span></div>}
        {phase === "error" && <div className="demo-banner" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}><b>Try-on failed</b><span>{error}</span></div>}
        {phase === "done" && <p className="tiny muted" style={{ margin: 0 }}>AI visualisation by {providerLabel}. It suggests how the outfit could look; it can&apos;t guarantee exact fit, colour or appearance.</p>}

        <div className="stack-sm">
          <span className="eyebrow">Your photo</span>
          <div className="row">
            <button className="btn ghost sm" onClick={() => setPhotoModal(true)}><Icon name="camera" size={13} /> {photo ? "Replace" : "Upload"}</button>
            {photo && <button className="btn ghost sm" onClick={async () => { await setPhoto(null); setResult(null); setPhase("idle"); toast("Your photo was deleted from this device."); }}><Icon name="trash" size={13} /> Delete</button>}
          </div>
          <span className="tiny muted">Stored only on this device. Sent to the try-on service only when you press Generate.</span>
        </div>

        {look ? (
          <div className="stack-sm">
            <span className="eyebrow">On the rail · {DIRECTION_LABEL[look.direction]}</span>
            <div className="panel" style={{ aspectRatio: "4/3.4" }}><LookBoard pieces={look.pieces} annotations={look.annotations} /></div>
            <div className="small">{look.pieces.map((p) => p.garment.name).join(" · ")}</div>
            <div className="row">
              <button className="btn" onClick={() => generate(look)} disabled={phase === "starting" || phase === "processing"}>
                <Icon name={phase === "done" ? "refresh" : "sparkle"} /> {phase === "done" ? "Regenerate" : !person ? "Add photo to preview" : live ? "Generate try-on" : "Generate (demo)"}
              </button>
              {phase === "done" && result && (
                <>
                  <button className="icon-btn" style={{ width: 46, height: 46 }} title="Compare" aria-label="Toggle comparison" onClick={() => setShowCompare((v) => !v)}><Icon name="compare" /></button>
                  <button className="icon-btn" style={{ width: 46, height: 46 }} title="Download" aria-label="Download image" onClick={() => downloadDataUrl(result, `my-gala-${look.title.toLowerCase().replace(/\s+/g, "-")}.png`)}><Icon name="download" /></button>
                </>
              )}
              <button className="icon-btn" style={{ width: 46, height: 46 }} title="Save to My Collection" aria-label="Save look" onClick={saveResult}><Icon name="heart" /></button>
            </div>
          </div>
        ) : (
          <div className="stack-sm">
            <p className="pull-quote" style={{ margin: 0 }}>Nothing on the rail yet.</p>
            <div className="row"><Link href="/edits" className="btn sm">Open an edit</Link><Link href="/studio" className="btn ghost sm">Go to the studio</Link></div>
          </div>
        )}

        {variants.length > 1 && (
          <div className="stack-sm">
            <span className="eyebrow">Also on the rail</span>
            <div className="variants">
              {variants.map((v) => (
                <button key={v.id} className={cx("variant", v.id === look?.id && "on")} onClick={() => pick(v)}>
                  <div className="mini"><LookBoard pieces={v.pieces} compact /></div>
                  <div><div className="display" style={{ fontSize: 19 }}>{v.title}</div><div className="tiny muted">{DIRECTION_LABEL[v.direction]}</div></div>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      <Modal open={photoModal} onClose={() => setPhotoModal(false)}>
        <div className="between" style={{ marginBottom: 16 }}><h2 className="display h-md" style={{ margin: 0 }}>Your photograph</h2><button className="icon-btn" aria-label="Close" onClick={() => setPhotoModal(false)}><Icon name="close" /></button></div>
        <PhotoSetup submitLabel="Save photo" onComplete={() => { setPhotoModal(false); setResult(null); setPhase("idle"); toast("Photo saved on this device."); }} />
      </Modal>
    </main>
  );
}
