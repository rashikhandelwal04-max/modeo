"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LookBoard from "@/components/LookBoard";
import PhotoSetup from "@/components/PhotoSetup";
import { Icon } from "@/components/ui";
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
    <div
      ref={ref}
      className="compare"
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); move(e.clientX); }}
      onPointerMove={(e) => e.buttons && move(e.clientX)}
      role="slider"
      aria-label="Compare original and generated"
      aria-valuenow={Math.round(x)}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "ArrowLeft") setX((v) => Math.max(0, v - 5)); if (e.key === "ArrowRight") setX((v) => Math.min(100, v + 5)); }}
    >
      <img src={before} alt="Original photograph" />
      <div className="after" style={{ clipPath: `inset(0 0 0 ${x}%)` }}><img src={after} alt="Generated try-on" /></div>
      <div className="handle" style={{ left: `${x}%` }} />
      <span className="lbl" style={{ left: 14 }}>Original</span>
      <span className="lbl" style={{ right: 14 }}>AI try-on</span>
    </div>
  );
}

function primaryGarment(look: Look) {
  // a photographed garment the provider can use (the anchor first, then owned pieces with photos)
  const withImg = look.pieces.filter((p) => (p.garment.imageId || p.garment.imageUrl) && ["top", "bottom", "onepiece", "layer", "drape"].includes(roleOf(p.garment.category)));
  return withImg.find((p) => p.anchor) ?? withImg[0];
}

export default function TryOn() {
  const { photo, tryOn, set, status, saveLook, toast } = useApp();
  const router = useRouter();
  const person = useImage(photo?.imageId);
  const [look, setLook] = useState<Look | null>(tryOn?.look ?? null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [providerLabel, setProviderLabel] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(true);
  const [changingPhoto, setChangingPhoto] = useState(false);
  const cancelled = useRef(false);
  const variants = tryOn?.variants ?? [];

  useEffect(() => () => { cancelled.current = true; }, []);
  useEffect(() => { setLook(tryOn?.look ?? null); }, [tryOn?.look]);

  const generate = async (l: Look) => {
    if (!person || !photo) return;
    if (!photo.consentProcessing) { toast("Please confirm processing consent in your profile first."); return; }
    if (!status?.tryOn) { setPhase("demo"); setReason("No virtual try-on provider is connected, so nothing was sent anywhere."); return; }
    setPhase("starting");
    setResult(null);
    setError(null);
    setReason(null);
    try {
      const personImage = await resizeDataUrl(person, 1024, 0.9);
      const g = primaryGarment(l);
      let garmentImage: string | undefined;
      if (g?.garment.imageId) garmentImage = await getImage(g.garment.imageId);
      else if (g?.garment.imageUrl?.startsWith("https://")) garmentImage = g.garment.imageUrl;
      const role = g ? roleOf(g.garment.category) : undefined;
      const res = await fetch("/api/try-on", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consent: true,
          personImage,
          garmentImage,
          garmentCategory: role === "top" || role === "layer" ? "tops" : role === "bottom" ? "bottoms" : role ? "one-pieces" : "auto",
          outfitDescription: lookDescription(l),
        }),
      });
      const data = await res.json();
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

  const pickVariant = (v: Look) => {
    setLook(v);
    setResult(null);
    setPhase("idle");
    set({ tryOn: { look: v, variants } });
  };

  const saveResult = async () => {
    if (!look) return;
    let tryOnImageId: string | undefined;
    if (result) {
      tryOnImageId = uid("try_");
      await putImage(tryOnImageId, result);
    }
    saveLook({ ...look, id: look.id + "_" + Date.now().toString(36) }, { tryOnImageId });
    toast(result ? "Saved with your try-on image." : "Look saved.");
  };

  if (!photo || changingPhoto) {
    return (
      <div className="fade-in" style={{ maxWidth: 760 }}>
        <div className="page-head"><div><div className="eyebrow">Virtual Try-On</div><h1 className="display h-lg">See it <em>on you.</em></h1></div></div>
        <p className="lede">Upload a full-length photograph to visualise recommendations on yourself. You can still explore every look without one.</p>
        <PhotoSetup submitLabel="Save photo" onComplete={() => setChangingPhoto(false)} />
      </div>
    );
  }

  const live = !!status?.tryOn;

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <div className="eyebrow">Virtual Try-On</div>
          <h1 className="display h-lg">{look ? look.title : <>See it <em>on you.</em></>}</h1>
        </div>
        <div className="row">
          {live ? <span className="tag dark">Provider · {status?.tryOn === "fashn" ? "FASHN" : "Replicate"}</span> : <span className="tag warn">Demo mode — no provider configured</span>}
          <button className="btn ghost sm" onClick={() => router.push("/studio")}><Icon name="back" /> Back to recommendations</button>
        </div>
      </div>

      {!look ? (
        <div className="empty" style={{ minHeight: 380, alignContent: "center" }}>
          <div className="display h-md">Choose a look to try on</div>
          <p className="small muted" style={{ margin: 0 }}>Open Style Studio and press <i>Try this look on me</i> on any recommendation.</p>
          <Link className="btn" href="/studio">Go to Style Studio</Link>
        </div>
      ) : (
        <div className="tryon">
          <div className="stack">
            <div className="stage">
              {phase === "done" && result && person && showCompare ? (
                <Compare before={person} after={result} />
              ) : phase === "done" && result ? (
                <img src={result} alt="Generated try-on" />
              ) : (
                person && <img src={person} alt="Your photograph" />
              )}
              {(phase === "starting" || phase === "processing") && (
                <div className="loader"><div><div className="eyebrow" style={{ color: "#ddd" }}>{phase === "starting" ? "Preparing" : `Generating with ${providerLabel}`}</div><div className="display h-sm" style={{ marginTop: 8 }}>Dressing you in {look.title}</div><div className="bar" /></div></div>
              )}
              {phase !== "done" && <span className="lbl" style={{ left: 14 }}>Your photograph · original</span>}
            </div>
            {phase === "done" && result && (
              <p className="tiny muted" style={{ margin: 0 }}>AI-generated visualisation by {providerLabel}. It approximates how the outfit could look; it does not guarantee exact fit, colour or appearance.</p>
            )}
          </div>

          <aside className="stack" style={{ gap: 18 }}>
            {(phase === "demo" || (!live && phase === "idle")) && (
              <div className="demo-banner">
                <b>Demo mode</b>
                <span>No virtual try-on image has been generated. MODEO never fakes a try-on by pasting clothes over your photo. Add a <code>FASHN_API_KEY</code> or <code>REPLICATE_API_TOKEN</code> on the server to render looks on your photograph.</span>
                {reason && phase === "demo" && <span className="tiny">{reason}</span>}
              </div>
            )}
            {phase === "unsupported" && <div className="demo-banner"><b>Needs a garment photo</b><span>{reason}</span></div>}
            {phase === "error" && <div className="demo-banner" style={{ borderColor: "var(--danger)", background: "#f8eeee", color: "var(--danger)" }}><b>Try-on failed</b><span>{error}</span></div>}

            <div className="panel">
              <div style={{ aspectRatio: "4/3.6" }}><LookBoard pieces={look.pieces} annotations={look.annotations} /></div>
              <div className="pad stack-sm" style={{ paddingTop: 14 }}>
                <div className="eyebrow">{DIRECTION_LABEL[look.direction]}</div>
                <div className="small">{look.pieces.map((p) => p.garment.name).join(" · ")}</div>
              </div>
            </div>

            <div className="row">
              <button className="btn" onClick={() => generate(look)} disabled={phase === "starting" || phase === "processing"}>
                <Icon name={phase === "done" ? "refresh" : "sparkle"} /> {phase === "done" ? "Regenerate" : live ? "Generate try-on" : "Generate (demo)"}
              </button>
              {phase === "done" && result && (
                <>
                  <button className="icon-btn" style={{ width: 44, height: 44 }} title="Toggle comparison" aria-label="Toggle comparison" onClick={() => setShowCompare((v) => !v)}><Icon name="compare" /></button>
                  <button className="icon-btn" style={{ width: 44, height: 44 }} title="Download" aria-label="Download image" onClick={() => downloadDataUrl(result, `modeo-${look.title.toLowerCase().replace(/\s+/g, "-")}.png`)}><Icon name="download" /></button>
                </>
              )}
              <button className="icon-btn" style={{ width: 44, height: 44 }} title="Save look" aria-label="Save look" onClick={saveResult}><Icon name="heart" /></button>
            </div>

            {variants.length > 1 && (
              <div className="stack-sm">
                <div className="eyebrow">Outfit variations</div>
                <div className="variants">
                  {variants.map((v) => (
                    <button key={v.id} className={cx("variant", v.id === look.id && "on")} onClick={() => pickVariant(v)}>
                      <div className="mini"><LookBoard pieces={v.pieces} compact /></div>
                      <div><div className="display" style={{ fontSize: 20 }}>{v.title}</div><div className="tiny muted">{DIRECTION_LABEL[v.direction]}</div></div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button className="link-btn" style={{ justifySelf: "start", color: "var(--stone)" }} onClick={() => setChangingPhoto(true)}>Use a different photo</button>
          </aside>
        </div>
      )}
    </div>
  );
}
