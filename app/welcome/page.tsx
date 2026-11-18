"use client";
import { useRouter } from "next/navigation";
import PhotoSetup from "@/components/PhotoSetup";
import EditorialImage from "@/components/EditorialImage";
import { Monogram } from "@/components/brand";
import { useApp } from "@/lib/store/state";
import { IMAGES } from "@/lib/editorial";

const GUIDES = [
  { t: "Full body", d: "M17 4 a3 3 0 1 0 0.1 0 M17 10 V28 M10 14 H24 M17 28 L12 42 M17 28 L22 42" },
  { t: "Stand straight", d: "M17 4 a3 3 0 1 0 0.1 0 M17 10 V28 M12 13 L10 26 M22 13 L24 26 M15 28 L14 42 M19 28 L20 42" },
  { t: "Good light", d: "M17 14 a5 5 0 1 0 0.1 0 M17 4 V7 M17 26 V29 M7 19 H4 M30 19 H27" },
  { t: "Face clear", d: "M17 8 a6 6 0 1 0 0.1 0 M8 30 Q17 24 26 30 V44 H8 Z" },
  { t: "Plain wall", d: "M4 4 H30 V44 H4 Z M17 12 a3 3 0 1 0 0.1 0 M17 18 V32" },
];

export default function Welcome() {
  const router = useRouter();
  const { set } = useApp();
  const finish = () => { set({ onboarded: true }); router.push("/home"); };
  return (
    <div className="onb">
      <section className="onb-left">
        <EditorialImage src={IMAGES.heroLeft} alt="MY GALA" fallback="Ivory satin slip dress" position="50% 20%" />
        <span className="brand-on"><Monogram size={44} /></span>
      </section>
      <section className="onb-right">
        <h1 className="display h-lg">Let&apos;s make this personal</h1>
        <p className="lede" style={{ margin: 0 }}>Upload a full-length photo to see styles on you.</p>
        <div className="guides">
          {GUIDES.map((g) => (
            <div className="guide-i" key={g.t}>
              <svg viewBox="0 0 34 48" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"><path d={g.d} /></svg>
              {g.t}
            </div>
          ))}
        </div>
        <PhotoSetup onComplete={finish} onSkip={finish} />
      </section>
    </div>
  );
}
