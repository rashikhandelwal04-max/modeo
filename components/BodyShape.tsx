import type { BodyShape } from "@/lib/fit";

const DIMS: Record<Exclude<BodyShape, "unsure">, [number, number, number]> = {
  hourglass: [40, 22, 40],
  pear: [30, 24, 46],
  apple: [36, 40, 34],
  rectangle: [34, 31, 34],
  inverted: [48, 28, 28],
};

/** Simple line silhouette for a body shape (shoulder / waist / hip widths). */
export function BodyShapeIcon({ shape }: { shape: BodyShape }) {
  if (shape === "unsure") {
    return (
      <svg viewBox="0 0 60 124" aria-hidden><circle cx="30" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.2" /><text x="30" y="72" textAnchor="middle" fontSize="22" fill="currentColor" fontFamily="Montserrat, sans-serif">?</text></svg>
    );
  }
  const [s, w, h] = DIMS[shape];
  const L = (x: number) => 30 - x / 2, R = (x: number) => 30 + x / 2;
  const d = `M ${L(14)} 22 Q ${L(s)} 24 ${L(s)} 32 Q ${L(s) + 2} 48 ${L(w)} 58 Q ${L(h)} 70 ${L(h)} 82 L ${L(h) + 6} 120 M ${R(14)} 22 Q ${R(s)} 24 ${R(s)} 32 Q ${R(s) - 2} 48 ${R(w)} 58 Q ${R(h)} 70 ${R(h)} 82 L ${R(h) - 6} 120 M 30 88 L 30 120`;
  return (
    <svg viewBox="0 0 60 124" aria-hidden>
      <circle cx="30" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M ${L(w) - 1} 58 L ${R(w) + 1} 58`} stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 2" />
    </svg>
  );
}
