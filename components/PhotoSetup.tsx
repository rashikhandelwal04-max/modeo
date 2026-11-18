"use client";
import { useState } from "react";
import PhotoCropper from "./PhotoCropper";
import PrivacyNote from "./PrivacyNote";
import { fileToDataUrl, resizeDataUrl } from "@/lib/image";
import { putImage } from "@/lib/store/images";
import { useApp } from "@/lib/store/state";
import { uid, cx } from "@/lib/util";
import { Icon } from "./ui";

type Stage = "upload" | "crop" | "consent";

export default function PhotoSetup({ onComplete, onSkip, submitLabel = "Enter my studio" }: { onComplete: () => void; onSkip?: () => void; submitLabel?: string }) {
  const { setPhoto, toast } = useApp();
  const [stage, setStage] = useState<Stage>("upload");
  const [raw, setRaw] = useState<string | null>(null);
  const [cropped, setCropped] = useState<string | null>(null);
  const [own, setOwn] = useState(false);
  const [process, setProcess] = useState(false);
  const [training, setTraining] = useState(false);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const pick = async (file?: File) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
      toast("Please choose a JPEG, PNG or WebP photo.");
      return;
    }
    try {
      const url = await fileToDataUrl(file);
      setRaw(await resizeDataUrl(url, 2000, 0.92));
      setStage("crop");
    } catch {
      toast("That photo couldn't be opened. Try a JPEG or PNG.");
    }
  };

  const save = async () => {
    if (!cropped) return;
    setBusy(true);
    const imageId = uid("photo_");
    await putImage(imageId, cropped);
    await setPhoto({ imageId, addedAt: Date.now(), consentProcessing: process, consentTraining: training });
    setBusy(false);
    onComplete();
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      {stage === "upload" && (
        <>
          <label
            className={cx("drop", over && "over")}
            style={{ minHeight: 280 }}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]); }}
          >
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => pick(e.target.files?.[0])} aria-label="Upload a full-length photograph" />
            <div className="stack" style={{ justifyItems: "center" }}>
              <Icon name="camera" size={28} stroke={1.1} />
              <div className="display h-sm">Upload a full-length photograph</div>
              <div className="small muted">Drag &amp; drop, or click to choose from your device · JPEG, PNG or WebP</div>
            </div>
          </label>
          <PrivacyNote />
        </>
      )}

      {stage === "crop" && raw && (
        <div style={{ maxWidth: 380 }}>
          <PhotoCropper src={raw} onDone={(d) => { setCropped(d); setStage("consent"); }} onReplace={() => { setRaw(null); setStage("upload"); }} />
        </div>
      )}

      {stage === "consent" && cropped && (
        <div className="row" style={{ alignItems: "flex-start", gap: 26 }}>
          <div style={{ width: 170, flex: "none" }} className="stack-sm">
            <img src={cropped} alt="Your cropped photograph" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", border: "1px solid var(--line)" }} />
            <div className="row" style={{ gap: 14 }}>
              <button className="link-btn" onClick={() => setStage("crop")}>Re-crop</button>
              <button className="link-btn" onClick={() => { setRaw(null); setCropped(null); setStage("upload"); }}>Replace</button>
            </div>
          </div>
          <div className="stack" style={{ flex: 1, minWidth: 240 }}>
            <div className="eyebrow">Before we continue</div>
            <label className="check">
              <input type="checkbox" checked={own} onChange={(e) => setOwn(e.target.checked)} />
              <span>This is a photograph of me, or I have the permission of the person pictured to use it.</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={process} onChange={(e) => setProcess(e.target.checked)} />
              <span>I consent to MY GALA processing this photo to create try-on previews. It is sent to the try-on provider only when I press <i>Generate</i>.</span>
            </label>
            <label className="check" style={{ opacity: 0.85 }}>
              <input type="checkbox" checked={training} onChange={(e) => setTraining(e.target.checked)} />
              <span className="small">
                <b>Optional, separate:</b> allow my photo to be used to improve models in future. Off by default — MY GALA does not currently train on any photographs, and this is never assumed.
              </span>
            </label>
            <PrivacyNote compact />
            <div className="row">
              <button className="btn" disabled={!own || !process || busy} onClick={save}>{busy ? "Saving…" : submitLabel}</button>
              <button className="btn ghost" onClick={() => { setRaw(null); setCropped(null); setStage("upload"); toast("Photo discarded."); }}>
                <Icon name="trash" /> Delete photo
              </button>
            </div>
          </div>
        </div>
      )}

      {onSkip && (
        <button className="link-btn" style={{ justifySelf: "start", color: "var(--stone)" }} onClick={onSkip}>
          Skip for now — explore styling without a photo
        </button>
      )}
    </div>
  );
}
