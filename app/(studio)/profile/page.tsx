"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import PhotoSetup from "@/components/PhotoSetup";
import PrivacyNote from "@/components/PrivacyNote";
import { Icon, Modal } from "@/components/ui";
import { useApp } from "@/lib/store/state";
import { useImage } from "@/lib/store/images";
import { AESTHETICS, ATTRIBUTE_OPTIONS, CATEGORY_GROUPS } from "@/lib/taxonomy";
import { COLORS } from "@/lib/colors";
import { CATALOG_BY_KEY } from "@/lib/styling/catalog";
import type { StyleProfile } from "@/lib/types";
import { cx, formatDate } from "@/lib/util";

function Chips({ options, value, onChange }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="chips">
      {options.map((o) => <button key={o} className={cx("chip", value.includes(o) && "on")} onClick={() => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o])}>{o}</button>)}
    </div>
  );
}

export default function Profile() {
  const { profile, set, photo, setPhoto, status, resetAll, wardrobe, saved, toast } = useApp();
  const router = useRouter();
  const avatar = useImage(photo?.imageId);
  const [replacing, setReplacing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const up = (patch: Partial<StyleProfile>) => set({ profile: { ...profile, ...patch } });

  const cycleColor = (c: string) => {
    if (profile.colors.includes(c)) up({ colors: profile.colors.filter((x) => x !== c), avoidColors: [...profile.avoidColors, c] });
    else if (profile.avoidColors.includes(c)) up({ avoidColors: profile.avoidColors.filter((x) => x !== c) });
    else up({ colors: [...profile.colors, c] });
  };

  const learned = Object.entries(profile.affinity)
    .filter(([, v]) => v !== 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ k, v, label: CATALOG_BY_KEY.get(k)?.name ?? wardrobe.find((w) => "own:" + w.id === k)?.name ?? k.replace(/^ai:/, "").replace(/-/g, " ") }));

  return (
    <main className="page fade-in">
      <div className="page-head">
        <div>
          <div className="eyebrow">My Profile</div>
          <h1 className="mega h-lg">Your style <em style={{ textTransform: "none" }}>identity.</em></h1>
        </div>
      </div>

      <div className="prof">
        <aside className="stack" style={{ gap: 18 }}>
          <div className="panel">
            <div style={{ aspectRatio: "3/4", background: "var(--paper-2)", display: "grid", placeItems: "center" }}>
              {avatar ? <img src={avatar} alt="Your photograph" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="small muted">No personal photo</span>}
            </div>
            <div className="pad stack-sm">
              {photo ? (
                <>
                  <span className="tiny muted">Added {formatDate(photo.addedAt)} · stored on this device only</span>
                  <label className="check small"><input type="checkbox" checked={photo.consentProcessing} onChange={(e) => setPhoto({ ...photo, consentProcessing: e.target.checked })} /><span>Allow processing for virtual try-on</span></label>
                  <label className="check small"><input type="checkbox" checked={photo.consentTraining} onChange={(e) => setPhoto({ ...photo, consentTraining: e.target.checked })} /><span>Separately allow use for model training (MY GALA does not currently train on photos)</span></label>
                  <div className="row">
                    <button className="btn sm" onClick={() => setReplacing(true)}>Replace</button>
                    <button className="btn ghost sm" onClick={async () => { await setPhoto(null); toast("Your photograph has been deleted from this device."); }}><Icon name="trash" size={13} /> Delete photo</button>
                  </div>
                </>
              ) : (
                <button className="btn sm" onClick={() => setReplacing(true)}>Add a photo</button>
              )}
            </div>
          </div>
          <PrivacyNote />
          <div className="panel pad stack-sm small">
            <div className="eyebrow">Integrations</div>
            <span><i className={cx("status-dot", status?.claude && "on")} style={{ background: status?.claude ? "var(--ink)" : undefined }} />AI stylist &amp; garment recognition: {status?.claude ? `Claude (${status.claudeModel})` : "not configured — using rule-based styling"}</span>
            <span><i className="status-dot" style={{ background: status?.tryOn ? "var(--ink)" : undefined }} />Virtual try-on: {status?.tryOn ? (status.tryOn === "fashn" ? "FASHN" : "Replicate") : "demo mode (no provider)"}</span>
            <span className="tiny muted">Keys live in the server environment only and are never sent to your browser.</span>
          </div>
        </aside>

        <div>
          <section className="section">
            <h3>Aesthetics</h3>
            <Chips options={AESTHETICS} value={profile.aesthetics} onChange={(aesthetics) => up({ aesthetics })} />
          </section>
          <section className="section">
            <h3>Colours</h3>
            <span className="small muted">Tap once to favour, twice to avoid, again to clear. Favourites become accents; avoided colours are never suggested.</span>
            <div className="swatches">
              {COLORS.filter((c) => c.name !== "pearl").map((c) => (
                <button key={c.name} title={`${c.name}${profile.colors.includes(c.name) ? " · favourite" : profile.avoidColors.includes(c.name) ? " · avoid" : ""}`} aria-label={c.name} className={cx("swatch-btn", profile.colors.includes(c.name) && "on", profile.avoidColors.includes(c.name) && "avoid")} style={{ background: c.hex }} onClick={() => cycleColor(c.name)} />
              ))}
            </div>
            <span className="tiny muted">{profile.colors.length ? `Favourites: ${profile.colors.join(", ")}` : "No favourites yet"}{profile.avoidColors.length ? ` · Avoid: ${profile.avoidColors.join(", ")}` : ""}</span>
          </section>
          <section className="section">
            <h3>Preferred fits</h3>
            <Chips options={ATTRIBUTE_OPTIONS.fit} value={profile.fits} onChange={(fits) => up({ fits })} />
          </section>
          <section className="section">
            <h3>Clothing I reach for</h3>
            <Chips options={[...CATEGORY_GROUPS.map((g) => g.label), "Indo-western", "Co-ords", "Tailoring", "Knitwear", "Denim"]} value={profile.categories} onChange={(categories) => up({ categories })} />
          </section>
          <section className="section">
            <h3>Budget</h3>
            <div className="seg">
              {(["accessible", "mid", "investment"] as const).map((b) => <button key={b} className={cx(profile.budget === b && "on")} onClick={() => up({ budget: b })}>{b}</button>)}
            </div>
          </section>
          <section className="section">
            <h3>Occasions I dress for</h3>
            <Chips options={ATTRIBUTE_OPTIONS.occasion} value={profile.occasions} onChange={(occasions) => up({ occasions })} />
          </section>
          <section className="section">
            <h3>Comfort</h3>
            <Chips options={["No heels", "Flat shoes only", "Breathable fabrics", "No sleeveless", "Modest necklines", "Loose fits", "Stretch waistbands", "No dry-clean only"]} value={profile.comfort} onChange={(comfort) => up({ comfort })} />
            <span className="tiny muted">Comfort preferences are shared with the AI stylist when it is connected; the offline rule-based stylist only uses fit, colour and budget.</span>
          </section>
          <section className="section">
            <h3>What MY GALA has learned</h3>
            <span className="small muted">From {saved.length} saved looks and your 👍 / 👎 feedback. These weights nudge future recommendations.</span>
            {learned.length ? (
              <div className="chips">
                {learned.slice(0, 18).map((l) => <span key={l.k} className={cx("chip", l.v > 0 && "on")} style={{ cursor: "default" }}>{l.v > 0 ? "♥" : "–"} {l.label}</span>)}
              </div>
            ) : <span className="small">Nothing yet — save or rate a few looks.</span>}
            {learned.length > 0 && <button className="link-btn" style={{ justifySelf: "start" }} onClick={() => up({ affinity: {}, recent: [] })}>Reset learning</button>}
          </section>
          <section className="section" style={{ borderBottom: 0 }}>
            <h3>Your data</h3>
            <span className="small muted">Everything — photo, wardrobe, saved looks and preferences — is stored in this browser. Clearing it is permanent.</span>
            <button className="btn ghost" style={{ justifySelf: "start", borderColor: "var(--danger)", color: "var(--danger)" }} onClick={() => setConfirmReset(true)}>Delete all my data</button>
          </section>
        </div>
      </div>

      <Modal open={replacing} onClose={() => setReplacing(false)}>
        <div className="between" style={{ marginBottom: 16 }}><h2 className="display h-md" style={{ margin: 0 }}>Your photograph</h2><button className="icon-btn" aria-label="Close" onClick={() => setReplacing(false)}><Icon name="close" /></button></div>
        <PhotoSetup submitLabel="Save photo" onComplete={() => { setReplacing(false); toast("Photo saved on this device."); }} />
      </Modal>
      <Modal open={confirmReset} onClose={() => setConfirmReset(false)}>
        <div className="stack">
          <h2 className="display h-md" style={{ margin: 0 }}>Delete everything?</h2>
          <p className="small">This permanently removes your photograph, wardrobe, saved looks and preferences from this device.</p>
          <div className="row">
            <button className="btn" style={{ background: "var(--danger)", borderColor: "var(--danger)" }} onClick={async () => { await resetAll(); router.replace("/welcome"); }}>Delete all</button>
            <button className="btn ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
