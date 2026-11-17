"use client";
import { useRouter } from "next/navigation";
import PhotoSetup from "@/components/PhotoSetup";
import { useApp } from "@/lib/store/state";

const GUIDES = [
  { t: "Full body visible", d: "M17 4 a3 3 0 1 0 0.1 0 M17 10 V28 M10 14 H24 M17 28 L12 42 M17 28 L22 42" },
  { t: "Standing straight", d: "M17 4 a3 3 0 1 0 0.1 0 M17 10 V28 M12 13 L10 26 M22 13 L24 26 M15 28 L14 42 M19 28 L20 42 M4 44 H30" },
  { t: "Good lighting", d: "M17 14 a5 5 0 1 0 0.1 0 M17 4 V7 M17 26 V29 M7 19 H4 M30 19 H27 M10 12 L8 10 M24 12 L26 10 M10 26 L8 28 M24 26 L26 28" },
  { t: "Face & body clear", d: "M17 8 a6 6 0 1 0 0.1 0 M14 13 h0.1 M20 13 h0.1 M14 17 Q17 19 20 17 M8 30 Q17 24 26 30 V44 H8 Z" },
  { t: "Simple background", d: "M4 4 H30 V44 H4 Z M17 12 a3 3 0 1 0 0.1 0 M17 18 V32 M13 22 H21 M17 32 L14 42 M17 32 L20 42" },
];

export default function Welcome() {
  const router = useRouter();
  const { set, photo } = useApp();
  const finish = () => {
    set({ onboarded: true });
    router.push("/home");
  };
  return (
    <div className="onb">
      <section className="onb-left">
        <div className="between">
          <div className="brand">MODEO</div>
          <div className="steps"><span className="on" /><span className={photo ? "on" : ""} /><span /></div>
        </div>
        <div className="stack" style={{ gap: 22 }}>
          <div className="eyebrow" style={{ color: "#8c8a85" }}>Your wardrobe. Your style. Reimagined.</div>
          <h1 className="display h-xl">Let&apos;s make this <em>personal.</em></h1>
          <p className="lede" style={{ color: "#cfccc5" }}>Upload a full-length photograph and see how different styles could look on you.</p>
        </div>
        <div className="stack" style={{ gap: 16 }}>
          <div className="eyebrow" style={{ color: "#8c8a85" }}>For the best results</div>
          <div className="guides">
            {GUIDES.map((g) => (
              <div className="guide-i" key={g.t}>
                <svg viewBox="0 0 34 48" fill="none" stroke="#e9e6df" strokeWidth="1.1" strokeLinecap="round"><path d={g.d} /></svg>
                {g.t}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="onb-right">
        <div className="eyebrow">Step 1 · Your photograph</div>
        <PhotoSetup onComplete={finish} onSkip={finish} />
      </section>
    </div>
  );
}
