"use client";
/**
 * Fashion "technical flat" illustrations — the sketches designers use on spec sheets.
 * Every category has a hand-drawn-style vector, filled with the garment's colour and
 * optional pattern. Used wherever we don't have a real photo of the item.
 */
import { useId } from "react";
import { hexOf, hexToHsl } from "@/lib/colors";
import type { Category, Garment } from "@/lib/types";

type Shape = { d: string[]; details?: string[]; dots?: [number, number, number][]; strokeOnly?: boolean; metalStroke?: number };

function skirtHem(length?: string) {
  return length === "mini" ? 62 : length === "knee" ? 82 : length === "maxi" ? 114 : 104;
}

function shapeFor(cat: Category, g: Partial<Garment>): Shape {
  switch (cat) {
    case "shirt":
      return {
        d: ["M30 22 L42 15 Q50 21 58 15 L70 22 L90 42 L82 52 L72 43 L72 106 L28 106 L28 43 L18 52 L10 42 Z"],
        details: ["M42 15 L46 27 L50 22 L54 27 L58 15", "M50 22 L50 106", "M22 46 L18 52", "M78 46 L82 52"],
        dots: [[50, 40, 1.3], [50, 55, 1.3], [50, 70, 1.3], [50, 85, 1.3]],
      };
    case "tshirt":
      return { d: ["M33 20 Q50 30 67 20 L88 34 L80 48 L72 42 L72 104 L28 104 L28 42 L20 48 L12 34 Z"], details: ["M38 22 Q50 28 62 22"] };
    case "top":
      return { d: ["M36 20 Q50 30 64 20 L70 30 Q65 62 70 100 L30 100 Q35 62 30 30 Z"], details: ["M42 28 Q44 64 40 100", "M58 28 Q56 64 60 100", "M50 30 L50 100"] };
    case "camisole":
      return { d: ["M35 36 Q50 44 65 36 L69 98 L31 98 Z"], details: ["M37 36 L41 14", "M63 36 L59 14", "M35 42 Q50 50 65 42"] };
    case "tank":
      return { d: ["M38 14 L44 14 Q50 30 56 14 L62 14 Q64 30 72 36 L72 102 L28 102 L28 36 Q36 30 38 14 Z"], details: ["M28 96 L72 96", "M40 40 L40 96", "M50 40 L50 96", "M60 40 L60 96"] };
    case "knit":
      return { d: ["M33 18 Q50 26 67 18 L84 30 L94 92 L84 94 L74 50 L74 102 L26 102 L26 50 L16 94 L6 92 L16 30 Z"], details: ["M26 94 L74 94", "M26 98 L74 98", "M7 86 L16 88", "M84 88 L93 86", "M36 20 Q50 30 64 20"] };
    case "blouse":
      return { d: ["M34 18 Q50 28 66 18 L86 34 Q97 70 88 90 L80 88 L72 52 L72 102 L28 102 L28 52 L20 88 L12 90 Q3 70 14 34 Z"], details: ["M44 22 Q50 34 56 22", "M50 30 L46 44 M50 30 L54 44"] };
    case "saree-blouse":
      return { d: ["M30 32 Q50 46 70 32 L84 40 L80 54 L72 50 L72 74 Q50 80 28 74 L28 50 L20 54 L16 40 Z"], details: ["M30 70 Q50 76 70 70", "M40 36 Q50 50 60 36"] };
    case "blazer":
      return {
        d: ["M28 18 L42 13 L50 52 L58 13 L72 18 L90 36 L93 104 L83 104 L78 52 L78 108 L22 108 L22 52 L17 104 L7 104 L10 36 Z"],
        details: ["M42 13 L37 36 L44 40 L50 52", "M58 13 L63 36 L56 40 L50 52", "M50 52 L50 108", "M28 80 L40 80", "M60 80 L72 80"],
        dots: [[50, 70, 1.6], [50, 84, 1.6]],
      };
    case "jacket":
      return { d: ["M28 20 L42 15 L50 22 L58 15 L72 20 L90 38 L92 96 L82 96 L78 54 L78 92 L22 92 L22 54 L18 96 L8 96 L10 38 Z"], details: ["M50 22 L50 92", "M42 15 L44 30 L50 22 L56 30 L58 15", "M22 84 L78 84", "M30 46 L42 46 L42 56 L30 56", "M58 46 L70 46 L70 56 L58 56"] };
    case "coat":
      return { d: ["M28 14 L42 10 L50 42 L58 10 L72 14 L88 34 L93 100 L83 100 L78 50 L81 116 L19 116 L22 50 L17 100 L7 100 L12 34 Z"], details: ["M42 10 L36 32 L50 42", "M58 10 L64 32 L50 42", "M22 58 L78 58", "M46 54 L54 54 L54 62 L46 62 Z", "M50 62 L50 116"] };
    case "trousers":
      return { d: ["M30 12 L70 12 L74 30 L84 114 L57 114 L50 44 L43 114 L16 114 L26 30 Z"], details: ["M29 19 L71 19", "M38 30 L32 112", "M62 30 L68 112", "M50 19 L50 40"] };
    case "jeans":
      return { d: ["M32 12 L68 12 L70 30 L70 114 L53 114 L50 46 L47 114 L30 114 L30 30 Z"], details: ["M31 19 L69 19", "M33 22 Q38 34 46 24", "M67 22 Q62 34 54 24", "M50 19 L50 44", "M31 108 L47 108", "M53 108 L70 108"] };
    case "shorts":
      return { d: ["M30 28 L70 28 L74 48 L77 84 L54 84 L50 62 L46 84 L23 84 L26 48 Z"], details: ["M29 35 L71 35", "M50 35 L50 60", "M36 40 L32 82", "M64 40 L68 82"] };
    case "skirt": {
      const h = skirtHem(g.length);
      return { d: [`M36 16 L64 16 L66 24 L${h > 90 ? 80 : 74} ${h} Q50 ${h + 6} ${h > 90 ? 20 : 26} ${h} L34 24 Z`], details: ["M34 24 L66 24", `M44 24 L40 ${h + 2}`, `M56 24 L60 ${h + 2}`, `M50 24 L50 ${h + 3}`] };
    }
    case "dress": {
      const h = skirtHem(g.length);
      return { d: [`M38 10 L44 10 Q50 20 56 10 L62 10 L64 36 Q60 44 64 48 L84 ${h} Q50 ${h + 6} 16 ${h} L36 48 Q40 44 36 36 Z`], details: ["M36 48 Q50 52 64 48", `M50 52 L50 ${h + 3}`] };
    }
    case "jumpsuit":
      return { d: ["M38 10 L44 10 Q50 20 56 10 L62 10 L66 40 L64 50 L80 114 L56 114 L50 66 L44 114 L20 114 L36 50 L34 40 Z"], details: ["M34 48 Q50 52 66 48", "M50 20 L50 64"] };
    case "saree":
      return {
        d: ["M28 46 Q50 42 72 46 L78 112 Q50 117 22 112 Z", "M28 46 L58 8 L72 13 L76 42 L72 47 Q60 50 52 60 Z"],
        details: ["M42 50 L38 112", "M48 50 L46 113", "M54 52 L54 114", "M24 104 Q50 109 77 104", "M58 8 L76 40"],
      };
    case "lehenga":
      return { d: ["M38 30 L62 30 L90 112 Q50 119 10 112 Z", "M34 10 Q50 18 66 10 L68 24 Q50 30 32 24 Z"], details: ["M38 34 L62 34", "M14 104 Q50 111 86 104", "M44 34 L32 112", "M56 34 L68 112", "M50 34 L50 115"] };
    case "kurta":
    case "salwar-suit":
      return {
        d: ["M34 14 Q50 24 66 14 L82 26 L87 66 L78 66 L72 36 L74 110 L26 110 L28 36 L22 66 L13 66 L18 26 Z"],
        details: ["M44 16 L50 32 L56 16", "M50 32 L50 46", "M26 84 L28 110", "M74 84 L72 110", ...(cat === "salwar-suit" ? ["M70 10 Q86 60 66 116"] : [])],
      };
    case "kurti":
      return { d: ["M34 18 Q50 28 66 18 L82 30 L85 60 L77 60 L72 40 L74 88 L26 88 L28 40 L23 60 L15 60 L18 30 Z"], details: ["M44 20 L50 34 L56 20", "M26 72 L28 88", "M74 72 L72 88"] };
    case "palazzo":
      return { d: ["M32 12 L68 12 L72 26 L90 114 L54 114 L50 40 L46 114 L10 114 L28 26 Z"], details: ["M31 19 L69 19", "M40 30 L26 112", "M60 30 L74 112"] };
    case "churidar":
      return { d: ["M36 12 L64 12 L62 30 L58 114 L51 114 L50 44 L49 114 L42 114 L38 30 Z"], details: ["M36 18 L64 18", "M43 96 L49 98 M43 102 L49 104 M43 108 L49 110", "M51 98 L57 96 M51 104 L57 102 M51 110 L57 108"] };
    case "dupatta":
      return { d: ["M18 14 L40 10 Q62 52 46 112 L26 114 Q42 60 18 14 Z"], details: ["M22 20 L39 16", "M27 108 L46 106", "M28 114 L27 118 M34 114 L34 118 M40 113 L41 117 M46 112 L47 116"] };
    case "ethnic-jacket":
      return { d: ["M32 16 L44 12 L50 20 L56 12 L68 16 L75 28 L77 100 L23 100 L25 28 Z"], details: ["M44 12 L44 18 L56 18 L56 12", "M50 20 L50 100", "M30 70 L42 70", "M58 70 L70 70"], dots: [[50, 34, 1.4], [50, 48, 1.4], [50, 62, 1.4]] };
    case "indo-western":
      return { d: ["M30 14 Q50 22 70 14 L92 62 Q50 72 8 62 Z", "M36 66 L64 66 L70 114 L54 114 L50 84 L46 114 L30 114 Z"], details: ["M50 20 L50 64"] };
    // ---- footwear (side views) ----
    case "sneakers":
      return { d: ["M14 74 Q16 58 30 56 L48 52 Q60 50 66 58 L84 64 Q93 68 90 78 L14 78 Z", "M12 78 L92 78 L92 86 Q50 88 12 86 Z"], details: ["M40 56 L46 66 M46 54 L52 64 M52 53 L58 62", "M20 70 L40 70"] };
    case "loafers":
      return { d: ["M12 76 Q14 64 28 62 L64 62 Q86 64 90 76 L90 82 L12 82 Z", "M12 82 L24 82 L24 88 L12 88 Z"], details: ["M50 62 Q56 70 66 70 Q70 70 72 66", "M54 68 L64 68"] };
    case "heels":
      return { d: ["M18 80 Q20 62 30 62 Q46 70 64 70 L84 74 Q92 78 86 80 L46 82 Q34 84 30 84 Z", "M28 84 L32 84 L30 104 L28 104 Z"], details: ["M30 62 Q34 74 46 80"] };
    case "boots": {
      const top = /knee/.test(g.name ?? "") ? 14 : 34;
      return { d: [`M30 ${top} L54 ${top} L55 70 L82 76 Q91 80 88 88 L26 88 Z`, "M26 88 L36 88 L36 96 L26 96 Z"], details: [`M30 ${top + 6} L54 ${top + 6}`, "M48 50 L48 82"] };
    }
    case "flats":
      return { d: ["M14 78 Q16 68 30 68 L76 68 Q91 70 90 80 L14 82 Z"], details: ["M56 68 Q60 74 66 68", "M58 72 L54 76 M64 72 L68 76"] };
    case "sandals":
      return { d: ["M12 84 L88 84 Q92 86 88 90 L12 90 Z", "M18 90 L28 90 L28 104 L18 104 Z"], details: ["M30 84 Q44 62 60 84", "M58 84 Q70 70 80 84", "M24 84 L24 66 Q30 62 36 66"] };
    case "juttis":
      return { d: ["M12 80 Q20 66 40 66 L70 66 Q86 66 94 56 Q92 76 80 82 L12 84 Z"], details: ["M40 66 Q52 76 70 66"], dots: [[48, 74, 1.1], [56, 74, 1.1], [64, 73, 1.1], [52, 70, 1.1], [60, 70, 1.1]] };
    case "kolhapuris":
      return { d: ["M10 84 Q12 78 22 78 L82 78 Q92 80 90 86 L10 88 Z"], details: ["M40 78 Q52 60 66 78", "M60 78 L60 70", "M44 70 Q52 64 60 70"] };
    // ---- jewellery ----
    case "earrings":
      if (/hoop/.test(g.name ?? "")) return { d: ["M34 56 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0", "M66 56 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0"], strokeOnly: true, metalStroke: 3 };
      return { d: ["M34 40 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0", "M34 48 Q26 66 34 76 Q42 66 34 48 Z", "M66 40 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0", "M66 48 Q58 66 66 76 Q74 66 66 48 Z"], details: ["M34 44 L34 48", "M66 44 L66 48"] };
    case "jhumkas":
      return {
        d: ["M34 36 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0", "M22 68 Q34 44 46 68 Z", "M66 36 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0", "M54 68 Q66 44 78 68 Z"],
        details: ["M34 41 L34 50", "M66 41 L66 50", "M24 66 L44 66", "M56 66 L76 66"],
        dots: [[24, 72, 1.6], [29, 73, 1.6], [34, 74, 1.6], [39, 73, 1.6], [44, 72, 1.6], [56, 72, 1.6], [61, 73, 1.6], [66, 74, 1.6], [71, 73, 1.6], [76, 72, 1.6]],
      };
    case "necklace":
      if (/choker|pearl/.test(g.name ?? "")) return { d: [], dots: Array.from({ length: 15 }, (_, i) => { const a = Math.PI * (0.1 + (0.8 * i) / 14); return [50 - Math.cos(a) * 30, 34 + Math.sin(a) * 24, 3.2] as [number, number, number]; }) };
      return { d: ["M22 24 Q50 96 78 24", "M50 62 L44 74 L50 86 L56 74 Z"], strokeOnly: true, metalStroke: 2 };
    case "bangles":
      return { d: ["M50 46 m-26 0 a26 9 0 1 0 52 0 a26 9 0 1 0 -52 0", "M50 58 m-26 0 a26 9 0 1 0 52 0 a26 9 0 1 0 -52 0", "M50 70 m-26 0 a26 9 0 1 0 52 0 a26 9 0 1 0 -52 0"], strokeOnly: true, metalStroke: 3.2 };
    case "ring":
      return { d: ["M50 66 m-18 0 a18 18 0 1 0 36 0 a18 18 0 1 0 -36 0", "M42 48 L50 38 L58 48 Z"], strokeOnly: true, metalStroke: 3.4 };
    case "watch":
      return { d: ["M42 14 L58 14 L58 106 L42 106 Z", "M50 60 m-16 0 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0"], details: ["M50 60 L50 50", "M50 60 L57 63"] };
    // ---- bags & accessories ----
    case "bag":
      if (/tote|crossbody/.test(g.name ?? "")) return { d: ["M20 44 L80 44 L86 106 L14 106 Z"], details: ["M34 44 Q34 14 50 14 Q66 14 66 44", "M22 56 L78 56"] };
      return { d: ["M22 50 L78 50 L83 102 L17 102 Z"], details: ["M36 50 Q36 26 50 26 Q64 26 64 50", "M22 50 L50 70 L78 50", "M48 68 L52 68 L52 74 L48 74 Z"] };
    case "clutch":
      return { d: ["M16 50 L84 50 L84 84 L16 84 Z"], details: ["M16 58 L84 58", "M46 46 L54 46 L54 54 L46 54 Z"] };
    case "potli":
      return { d: ["M32 48 Q18 70 28 96 Q50 106 72 96 Q82 70 68 48 Z", "M32 48 Q50 40 68 48 L64 40 Q50 36 36 40 Z"], details: ["M36 40 L28 24 M64 40 L72 24", "M30 80 Q50 88 70 80"], dots: [[40, 66, 1.4], [50, 70, 1.4], [60, 66, 1.4]] };
    case "belt":
      return { d: ["M6 54 L94 54 L94 66 L6 66 Z", "M40 50 L56 50 L56 70 L40 70 Z"], details: ["M70 60 L72 60 M78 60 L80 60 M86 60 L88 60"] };
    case "scarf":
      return { d: ["M50 14 L88 52 L50 90 L12 52 Z", "M40 82 L34 112 L46 110 Z", "M60 82 L66 112 L54 110 Z"], details: ["M50 24 L78 52 L50 80 L22 52 Z"] };
    case "sunglasses":
      return { d: ["M12 52 Q12 44 20 44 L42 44 Q46 44 46 50 Q44 70 30 70 Q14 70 12 52 Z", "M88 52 Q88 44 80 44 L58 44 Q54 44 54 50 Q56 70 70 70 Q86 70 88 52 Z"], details: ["M46 48 Q50 44 54 48", "M12 48 L4 44", "M88 48 L96 44"] };
    default:
      return { d: ["M30 20 L70 20 L74 100 L26 100 Z"] };
  }
}

function patternDefs(id: string, pattern: string | undefined, ink: string) {
  switch (pattern) {
    case "stripes":
      return <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(90)"><rect width="2.2" height="6" fill={ink} /></pattern>;
    case "check":
      return <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="2" fill={ink} /><rect width="2" height="10" fill={ink} /></pattern>;
    case "polka dot":
      return <pattern id={id} width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="1.6" fill={ink} /></pattern>;
    case "floral":
    case "paisley":
    case "block print":
      return (
        <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={ink} strokeWidth="0.9"><circle cx="8" cy="8" r="2.2" /><path d="M8 3.5 Q10 6 8 5.8 Q6 6 8 3.5 M12.5 8 Q10 10 10.2 8 Q10 6 12.5 8 M8 12.5 Q6 10 8 10.2 Q10 10 8 12.5 M3.5 8 Q6 6 5.8 8 Q6 10 3.5 8" /></g>
        </pattern>
      );
    case "embroidered":
    case "zari border":
      return <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse"><path d="M4 1 L5 4 L4 7 L3 4 Z" fill={ink} opacity="0.8" /></pattern>;
    case "animal":
      return <pattern id={id} width="14" height="12" patternUnits="userSpaceOnUse"><path d="M3 3 q3 -2 4 1 q-2 3 -4 -1 M9 8 q3 -1 3 2 q-3 2 -3 -2" fill={ink} /></pattern>;
    case "graphic":
    case "abstract":
      return <pattern id={id} width="22" height="22" patternUnits="userSpaceOnUse"><path d="M2 18 Q8 4 14 12 T22 6" fill="none" stroke={ink} strokeWidth="1.4" /><circle cx="16" cy="18" r="2.2" fill={ink} /></pattern>;
    default:
      return null;
  }
}

export default function Flat({ garment, className, title }: { garment: Partial<Garment> & { category: Category }; className?: string; title?: string }) {
  const id = useId().replace(/:/g, "");
  const fill = garment.colorHex || hexOf(garment.color ?? "grey");
  const [, , l] = hexToHsl(fill);
  const detail = l < 0.35 ? "rgba(255,255,255,0.5)" : "rgba(20,20,20,0.42)";
  const patInk = l < 0.4 ? "rgba(255,255,255,0.55)" : "rgba(20,20,20,0.35)";
  const s = shapeFor(garment.category, garment);
  const pat = patternDefs(`p${id}`, garment.pattern, patInk);
  const gold = garment.detail && /gold|zari/.test(garment.detail);
  const outline = "#1b1b1b";
  return (
    <svg viewBox="0 0 100 120" className={className} role="img" aria-label={title ?? garment.name ?? garment.category}>
      <defs>
        {pat}
        <filter id={`f${id}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="0.9" />
        </filter>
      </defs>
      <g filter={`url(#f${id})`} strokeLinejoin="round" strokeLinecap="round">
        {s.d.map((d, i) =>
          s.strokeOnly ? (
            <g key={i}>
              <path d={d} fill="none" stroke={outline} strokeWidth={(s.metalStroke ?? 2) + 1.4} />
              <path d={d} fill="none" stroke={fill} strokeWidth={s.metalStroke ?? 2} />
            </g>
          ) : (
            <g key={i}>
              <path d={d} fill={fill} stroke={outline} strokeWidth="1.1" />
              {pat && <path d={d} fill={`url(#p${id})`} stroke="none" />}
            </g>
          ),
        )}
        {s.details?.map((d, i) => <path key={i} d={d} fill="none" stroke={detail} strokeWidth="0.9" />)}
        {s.dots?.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={s.d.length === 0 ? fill : detail} stroke={s.d.length === 0 ? outline : "none"} strokeWidth="0.8" />)}
        {gold && (garment.category === "saree" || garment.category === "lehenga" || garment.category === "dupatta") && (
          <path d={garment.category === "dupatta" ? "M27 110 L46 108" : garment.category === "lehenga" ? "M13 108 Q50 115 87 108" : "M23 108 Q50 113 77 108"} fill="none" stroke="#c9a24a" strokeWidth="3.2" />
        )}
      </g>
    </svg>
  );
}
