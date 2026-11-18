/**
 * MY GALA personal stylist logic.
 *
 * 1. Understand the user's garment (ask for what's missing — never invent it).
 * 2. Offer pairings as individual garments the user can compare (colour × neckline × fit).
 * 3. Add footwear. Accessories and poses are optional extras.
 * 4. Give proportion advice from optional, approximate inputs (height) — never body judgement.
 */
import { analogous, complements, hexOf, hexToHsl, isNeutral, partnerNeutrals, rgbToHex, hexToRgb, cap } from "./colors";
import { roleOf } from "./taxonomy";
import type { Category, Garment, GarmentAttributes, StyleProfile } from "./types";
import { hashStr } from "./util";

// ---------------------------------------------------------------------------
// 1. Garment questions
// ---------------------------------------------------------------------------
export interface Question {
  key: "silhouette" | "length" | "fabric" | "fit" | "neckline" | "sleeve" | "rise" | "detail";
  label: string;
  options: string[];
  required?: boolean;
}

const FABRICS = ["Cotton", "Linen", "Satin", "Silk", "Denim", "Knit", "Chiffon", "Leather", "Crepe", "Wool"];

export function questionsFor(cat: Category): Question[] {
  switch (cat) {
    case "skirt":
      return [
        { key: "silhouette", label: "Shape", options: ["A-line", "Pencil", "Pleated", "Wrap", "Slip", "Tiered"], required: true },
        { key: "length", label: "Length", options: ["Mini", "Knee", "Midi", "Maxi"], required: true },
        { key: "fabric", label: "Fabric", options: ["Satin", "Cotton", "Linen", "Denim", "Chiffon", "Leather", "Knit"] },
      ];
    case "trousers": case "jeans": case "shorts": case "palazzo": case "churidar":
      return [
        { key: "fit", label: "Fit", options: ["Wide-leg", "Straight", "Slim", "Flared", "Relaxed"], required: true },
        { key: "rise", label: "Waist", options: ["High-waisted", "Mid-rise", "Low-rise"] },
        { key: "length", label: "Length", options: ["Full-length", "Ankle", "Cropped"] },
        { key: "fabric", label: "Fabric", options: cat === "jeans" ? ["Denim"] : ["Wool", "Linen", "Cotton", "Satin", "Crepe", "Denim"] },
      ];
    case "dress": case "jumpsuit":
      return [
        { key: "silhouette", label: "Shape", options: ["A-line", "Slip", "Bodycon", "Wrap", "Shirt dress", "Fit & flare"], required: true },
        { key: "length", label: "Length", options: ["Mini", "Knee", "Midi", "Maxi"], required: true },
        { key: "neckline", label: "Neckline", options: ["Strappy", "V-neck", "Square", "Halter", "Crew", "Off-shoulder"] },
        { key: "fabric", label: "Fabric", options: FABRICS },
      ];
    case "shirt": case "tshirt": case "top": case "camisole": case "tank": case "knit": case "blouse": case "kurti":
      return [
        { key: "neckline", label: "Neckline", options: ["Crew", "V-neck", "Square", "Halter", "Off-shoulder", "Collared"], required: true },
        { key: "fit", label: "Fit", options: ["Fitted", "Relaxed", "Cropped", "Oversized"] },
        { key: "sleeve", label: "Sleeves", options: ["Sleeveless", "Short", "Long"] },
        { key: "fabric", label: "Fabric", options: FABRICS },
      ];
    case "blazer": case "jacket": case "coat": case "ethnic-jacket":
      return [
        { key: "fit", label: "Fit", options: ["Tailored", "Oversized", "Cropped", "Longline"], required: true },
        { key: "fabric", label: "Fabric", options: ["Wool", "Linen", "Denim", "Leather", "Tweed", "Cotton"] },
      ];
    case "saree":
      return [
        { key: "fabric", label: "Fabric", options: ["Silk", "Chiffon", "Georgette", "Cotton", "Organza", "Banarasi"], required: true },
        { key: "detail", label: "Border", options: ["Gold zari", "Silver zari", "Plain", "Embroidered", "Printed"] },
      ];
    case "lehenga":
      return [
        { key: "fabric", label: "Fabric", options: ["Silk", "Georgette", "Velvet", "Net", "Raw silk"], required: true },
        { key: "detail", label: "Work", options: ["Heavy embroidery", "Light embroidery", "Plain", "Sequins"] },
      ];
    case "kurta": case "salwar-suit":
      return [
        { key: "length", label: "Length", options: ["Hip", "Knee", "Calf"], required: true },
        { key: "fit", label: "Fit", options: ["Straight", "A-line", "Anarkali", "Relaxed"] },
        { key: "fabric", label: "Fabric", options: ["Cotton", "Silk", "Linen", "Chanderi", "Georgette"] },
      ];
    default:
      return [{ key: "fabric", label: "Material", options: FABRICS }];
  }
}

export function missingInfo(g: Partial<GarmentAttributes>, hasPhoto: boolean): string[] {
  if (!g.category) return ["type"];
  const out: string[] = [];
  if (!g.color) out.push("colour");
  if (hasPhoto) return out;
  for (const q of questionsFor(g.category)) if (q.required && !g[q.key]) out.push(q.label.toLowerCase());
  return out;
}

// ---------------------------------------------------------------------------
// Shades
// ---------------------------------------------------------------------------
const NAMED_SHADES: Record<string, [string, string][]> = {
  yellow: [["Butter", "#f3e3a1"], ["Lemon", "#f3dc4a"], ["Canary", "#f7d417"], ["Marigold", "#e9a925"], ["Mustard", "#cf9d27"], ["Ochre", "#b9832a"]],
  red: [["Cherry", "#c0182b"], ["Scarlet", "#d6312d"], ["Brick", "#a3392b"], ["Wine", "#6e1d2c"], ["Coral", "#e66a5a"]],
  blush: [["Blush", "#e9c2b8"], ["Rose", "#d98d99"], ["Dusty pink", "#c99a9a"], ["Baby pink", "#f1c6d3"], ["Hot pink", "#d63c7f"]],
  green: [["Sage", "#a7b49a"], ["Olive", "#6b6e3f"], ["Emerald", "#1f7a4d"], ["Bottle", "#1d4a35"], ["Mint", "#b9dcc4"]],
  cobalt: [["Powder", "#a9c2e2"], ["Sky", "#7fb0de"], ["Cobalt", "#2346a0"], ["Navy", "#1f2a44"], ["Teal", "#1f6a6b"]],
  beige: [["Ivory", "#efe8da"], ["Sand", "#dccaa8"], ["Camel", "#b38a5a"], ["Taupe", "#8b7d6b"], ["Chocolate", "#4a3226"]],
};

export function shadesFor(colorName: string): { name: string; hex: string }[] {
  const key = Object.keys(NAMED_SHADES).find((k) => k === colorName) ?? (colorName === "mustard" ? "yellow" : colorName === "burgundy" ? "red" : colorName === "fuchsia" ? "blush" : colorName === "sage" || colorName === "olive" ? "green" : colorName === "sky blue" || colorName === "navy" || colorName === "teal" ? "cobalt" : colorName === "camel" || colorName === "ivory" || colorName === "taupe" ? "beige" : "");
  if (key) return NAMED_SHADES[key].map(([name, hex]) => ({ name, hex }));
  // generic: light → deep variations of the base colour
  const [r, g, b] = hexToRgb(hexOf(colorName));
  const mix = (t: number, to: number) => rgbToHex(r + (to - r) * t, g + (to - g) * t, b + (to - b) * t);
  return [
    { name: `Pale ${colorName}`, hex: mix(0.55, 255) },
    { name: `Soft ${colorName}`, hex: mix(0.25, 255) },
    { name: cap(colorName), hex: hexOf(colorName) },
    { name: `Deep ${colorName}`, hex: mix(0.35, 0) },
  ];
}

// ---------------------------------------------------------------------------
// 2. Pairing options
// ---------------------------------------------------------------------------
export type PairRole = "top" | "bottom" | "layer" | "blouse";

export interface Option {
  id: string;
  role: PairRole | "footwear" | "accessory";
  category: Category;
  name: string; // e.g. "Black halter-neck top"
  color: string;
  colorHex: string;
  neckline?: string;
  fit?: string;
  silhouette?: string;
  fabric?: string;
  why: string;
}

interface Template { name: string; category: Category; neckline?: string; fit?: string; silhouette?: string; fabric?: string; formal: number; note: string }

const TOPS: Template[] = [
  { name: "fitted T-shirt", category: "tshirt", neckline: "Crew", fit: "Fitted", fabric: "cotton jersey", formal: 1, note: "a clean, easy base" },
  { name: "halter-neck top", category: "top", neckline: "Halter", fit: "Fitted", fabric: "rib knit", formal: 3, note: "the halter shows the shoulders and draws the eye up" },
  { name: "off-shoulder top", category: "top", neckline: "Off-shoulder", fit: "Fitted", fabric: "cotton", formal: 3, note: "a wide neckline balances a fuller skirt" },
  { name: "square-neck fitted top", category: "top", neckline: "Square", fit: "Fitted", fabric: "stretch cotton", formal: 2, note: "the square neck frames the collarbone" },
  { name: "crisp button-down shirt", category: "shirt", neckline: "Collared", fit: "Relaxed", fabric: "cotton poplin", formal: 3, note: "tucked in, it sharpens the whole look" },
  { name: "satin camisole", category: "camisole", neckline: "V-neck", fit: "Fitted", fabric: "satin", formal: 3, note: "a little sheen for the evening" },
  { name: "V-neck fine knit", category: "knit", neckline: "V-neck", fit: "Fitted", fabric: "fine merino", formal: 2, note: "the V lengthens the neck" },
  { name: "cropped ribbed tank", category: "tank", neckline: "Crew", fit: "Cropped", fabric: "rib knit", formal: 1, note: "cropped to show the waistband" },
];
const BOTTOMS: Template[] = [
  { name: "high-waisted wide-leg trousers", category: "trousers", silhouette: "Wide-leg", fabric: "wool crepe", formal: 4, note: "a high waist makes the legs read longer" },
  { name: "straight-leg jeans", category: "jeans", silhouette: "Straight", fabric: "denim", formal: 1, note: "relaxed and grounded" },
  { name: "A-line midi skirt", category: "skirt", silhouette: "A-line", fabric: "cotton", formal: 2, note: "the flare balances a fitted top" },
  { name: "pencil skirt", category: "skirt", silhouette: "Pencil", fabric: "wool", formal: 4, note: "a sharp, tailored line" },
  { name: "bias-cut satin midi skirt", category: "skirt", silhouette: "Slip", fabric: "satin", formal: 3, note: "fluid fabric moves as you walk" },
  { name: "tailored shorts", category: "shorts", silhouette: "Tailored", fabric: "linen", formal: 2, note: "polished but easy" },
];
const LAYERS: Template[] = [
  { name: "tailored blazer", category: "blazer", fit: "Tailored", fabric: "wool", formal: 4, note: "structure over softness" },
  { name: "cropped jacket", category: "jacket", fit: "Cropped", fabric: "tweed", formal: 3, note: "cropped to keep the waist visible" },
  { name: "denim jacket", category: "jacket", fit: "Relaxed", fabric: "denim", formal: 1, note: "easy and casual" },
  { name: "fine-knit cardigan", category: "knit", fit: "Fitted", fabric: "cashmere", formal: 2, note: "soft and light" },
  { name: "trench coat", category: "coat", fit: "Longline", fabric: "cotton gabardine", formal: 3, note: "a long vertical line" },
];
const BLOUSES: Template[] = [
  { name: "sleeveless high-neck blouse", category: "saree-blouse", neckline: "High neck", fabric: "silk", formal: 4, note: "lets the drape be the hero" },
  { name: "puff-sleeve blouse", category: "saree-blouse", neckline: "Round", fabric: "cotton silk", formal: 3, note: "soft and romantic" },
  { name: "boat-neck elbow-sleeve blouse", category: "saree-blouse", neckline: "Boat", fabric: "silk", formal: 4, note: "classic and graceful" },
  { name: "corset blouse", category: "saree-blouse", neckline: "Sweetheart", fabric: "satin", formal: 4, note: "structured and modern" },
  { name: "crisp shirt-style blouse", category: "saree-blouse", neckline: "Collared", fabric: "cotton", formal: 3, note: "an instantly modern twist" },
];
const INDIAN_BOTTOMS: Template[] = [
  { name: "straight palazzo", category: "palazzo", silhouette: "Wide-leg", fabric: "cotton", formal: 2, note: "flowing and easy" },
  { name: "fitted churidar", category: "churidar", silhouette: "Slim", fabric: "cotton", formal: 3, note: "a slim base for a long kurta" },
  { name: "straight cigarette pants", category: "trousers", silhouette: "Straight", fabric: "crepe", formal: 3, note: "crisp and modern" },
  { name: "straight-leg jeans", category: "jeans", silhouette: "Straight", fabric: "denim", formal: 1, note: "an easy fusion pairing" },
];

/** The roles to fill, in order, for a given anchor garment. */
export function rolesToFill(cat: Category): PairRole[] {
  const role = roleOf(cat);
  if (cat === "saree" || cat === "lehenga") return ["blouse"];
  if (cat === "kurta" || cat === "kurti") return ["bottom"];
  if (cat === "palazzo" || cat === "churidar") return ["top"];
  if (role === "bottom") return ["top"];
  if (role === "top") return ["bottom"];
  if (role === "layer") return ["top", "bottom"];
  if (role === "onepiece") return ["layer"];
  return ["top", "bottom"];
}

export const ROLE_LABEL: Record<PairRole, string> = { top: "Tops", bottom: "Bottoms", layer: "Layers", blouse: "Blouses" };

function partnerColors(anchorColor: string, profile?: Partial<StyleProfile>): { name: string; relation: "neutral" | "contrast" | "tonal" }[] {
  const avoid = new Set(profile?.avoidColors ?? []);
  const out: { name: string; relation: "neutral" | "contrast" | "tonal" }[] = [];
  // black and white always qualify — black-on-black or white-on-white is a deliberate tonal look
  const add = (name: string, relation: "neutral" | "contrast" | "tonal") => { if (!avoid.has(name) && (name !== anchorColor || ["black", "white"].includes(name)) && !out.some((o) => o.name === name)) out.push({ name, relation: name === anchorColor ? "tonal" : relation }); };
  ["black", "white"].forEach((c) => add(c, "neutral"));
  partnerNeutrals(anchorColor).slice(0, 2).forEach((c) => add(c, "neutral"));
  complements(anchorColor).slice(0, 1).forEach((c) => add(c, "contrast"));
  if (!isNeutral(anchorColor)) analogous(anchorColor).slice(0, 1).forEach((c) => add(c, "tonal"));
  for (const f of profile?.colors ?? []) add(f, "contrast");
  return out.slice(0, 7);
}

const OCC_FORMAL: Record<string, number> = { "date night": 3, work: 3.5, party: 3.5, casual: 1.5, wedding: 4.5, festive: 4, specific: 2.5 };

export function pairingOptions(anchor: Garment, role: PairRole, occasion: string | undefined, profile?: Partial<StyleProfile>): Option[] {
  const pool = role === "top" ? (["palazzo", "churidar"].includes(anchor.category) ? [...TOPS.slice(0, 5), { name: "short kurti", category: "kurti" as Category, neckline: "Round", fit: "Relaxed", fabric: "block-print cotton", formal: 2, note: "an easy desi pairing" }] : TOPS)
    : role === "bottom" ? (["kurta", "kurti"].includes(anchor.category) ? INDIAN_BOTTOMS : BOTTOMS.filter((b) => b.category !== anchor.category || b.silhouette?.toLowerCase() !== anchor.silhouette?.toLowerCase()))
    : role === "layer" ? LAYERS : BLOUSES;
  const target = OCC_FORMAL[occasion ?? "specific"] ?? 2.5;
  const colors = partnerColors(anchor.color, profile);
  const opts: (Option & { score: number })[] = [];
  for (const t of pool) {
    for (const c of colors) {
      const name = `${cap(c.name)} ${t.name}`;
      const colourWhy = c.name === anchor.color
        ? `${cap(c.name)} on ${c.name} makes one unbroken, elongating line`
        : c.relation === "neutral"
        ? `${cap(c.name)} lets your ${anchor.color} piece lead`
        : c.relation === "contrast" ? `${cap(c.name)} and ${anchor.color} make a confident contrast` : `${cap(c.name)} keeps it tonal and soft`;
      const score = -Math.abs(t.formal - target) * 1.2 + (c.relation === "neutral" ? 1 : 0.4) + ((hashStr(name + anchor.id) % 100) / 100) * 0.6;
      opts.push({
        id: `${t.name}|${c.name}`.replace(/\s+/g, "-"),
        role, category: t.category, name, color: c.name, colorHex: hexOf(c.name),
        neckline: t.neckline, fit: t.fit, silhouette: t.silhouette, fabric: t.fabric,
        why: `${colourWhy}; ${t.note}.`,
        score,
      });
    }
  }
  // order so the first screen shows different styles (and colours) side by side, not one style in five colours
  opts.sort((a, b) => b.score - a.score);
  const byStyle = new Map<string, (Option & { score: number })[]>();
  for (const o of opts) { const k = o.id.split("|")[0]; byStyle.set(k, [...(byStyle.get(k) ?? []), o]); }
  const lists = Array.from(byStyle.values());
  const out: Option[] = [];
  for (let round = 0; out.length < opts.length; round++) {
    lists.forEach((l, i) => { const o = l[(round + i) % l.length]; if (round < l.length && !out.includes(o)) out.push(o); });
    if (round > 20) break;
  }
  for (const o of opts) if (!out.includes(o)) out.push(o);
  return out;
}

// ---------------------------------------------------------------------------
// 3. Footwear & optional accessories
// ---------------------------------------------------------------------------
const SHOES: Record<string, string[]> = {
  "date night": ["black strappy heeled sandals", "nude pointed slingbacks", "black ankle boots", "gold kitten heels"],
  work: ["black leather loafers", "nude pointed pumps", "black slingback kitten heels", "white leather sneakers"],
  party: ["black strappy heels", "silver metallic sandals", "black knee-high boots", "red pointed pumps"],
  casual: ["white leather sneakers", "black ballet flats", "tan leather sandals", "black loafers"],
  wedding: ["gold embellished sandals", "embroidered juttis", "nude block-heel sandals", "gold kolhapuris"],
  festive: ["embroidered juttis", "gold block-heel sandals", "tan kolhapuris", "nude kitten heels"],
  specific: ["white leather sneakers", "black leather loafers", "nude pointed slingbacks", "black strappy heeled sandals"],
};
const shoeCategory = (n: string): Category => (/sneaker/.test(n) ? "sneakers" : /loafer/.test(n) ? "loafers" : /boot/.test(n) ? "boots" : /flat/.test(n) ? "flats" : /jutti/.test(n) ? "juttis" : /kolhapuri/.test(n) ? "kolhapuris" : /sandal/.test(n) ? "sandals" : "heels");

export function footwearOptions(anchor: Garment, occasion: string | undefined): Option[] {
  const indian = ["saree", "lehenga", "kurta", "kurti", "salwar-suit", "palazzo", "churidar"].includes(anchor.category);
  const key = indian && !["wedding", "festive"].includes(occasion ?? "") ? "festive" : occasion ?? "specific";
  return (SHOES[key] ?? SHOES.specific).map((n) => {
    const color = /white/.test(n) ? "white" : /gold/.test(n) ? "gold" : /silver/.test(n) ? "silver" : /nude|tan/.test(n) ? "beige" : /red/.test(n) ? "red" : "black";
    return { id: n.replace(/\s+/g, "-"), role: "footwear" as const, category: shoeCategory(n), name: cap(n), color, colorHex: hexOf(color), why: /nude|pointed/.test(n) ? "Nude and pointed shapes extend the leg line." : "Keeps the focus on the clothes." };
  });
}

export function accessoryOptions(anchor: Garment, occasion: string | undefined): Option[] {
  const indian = ["saree", "lehenga", "kurta", "kurti", "salwar-suit"].includes(anchor.category);
  const list: [string, Category, string][] = indian
    ? [["gold jhumka earrings", "jhumkas", "gold"], ["pearl choker necklace", "necklace", "pearl"], ["embroidered potli bag", "potli", "gold"], ["stacked gold bangles", "bangles", "gold"]]
    : occasion === "work"
      ? [["structured black leather handbag", "bag", "black"], ["slim gold hoop earrings", "earrings", "gold"], ["slim black leather belt", "belt", "black"], ["minimal gold watch", "watch", "gold"]]
      : [["small black shoulder bag", "bag", "black"], ["gold hoop earrings", "earrings", "gold"], ["fine gold chain necklace", "necklace", "gold"], ["black sunglasses", "sunglasses", "black"]];
  return list.map(([n, c, color]) => ({ id: n.replace(/\s+/g, "-"), role: "accessory" as const, category: c, name: cap(n), color, colorHex: hexOf(color), why: "Optional finishing touch." }));
}

// ---------------------------------------------------------------------------
// 4. Proportion advice (kind, optional, approximate)
// ---------------------------------------------------------------------------
export function proportionTips(anchor: Garment, picks: Option[], profile?: Partial<StyleProfile>): string[] {
  const tips: string[] = [];
  const h = profile?.heightCm;
  const all = `${anchor.length ?? ""} ${anchor.silhouette ?? ""} ${anchor.rise ?? ""} ${anchor.fit ?? ""}`.toLowerCase();
  const top = picks.find((p) => p.role === "top" || p.role === "blouse");
  if (/high-waisted/.test(all) || ["skirt"].includes(anchor.category)) tips.push("Wearing it at your natural waist places the break higher, so your legs read longer.");
  if (top && ["skirt", "trousers", "jeans", "palazzo"].includes(anchor.category)) tips.push(top.fit === "Relaxed" ? "Tuck the front of the top in to keep your waist defined." : "A fitted or tucked top keeps the waistline clear.");
  if (top && top.color && !isNeutral(anchor.color)) {
    const contrast = Math.abs(hexToHsl(top.colorHex)[2] - hexToHsl(anchor.colorHex ?? hexOf(anchor.color))[2]) > 0.3;
    tips.push(contrast ? "Strong contrast splits the outfit at the waist — that line becomes a focal point." : "Close tones top and bottom create one long, unbroken line.");
  }
  if (top && /V-neck|Halter|Off-shoulder|Square/.test(top.neckline ?? "")) tips.push("Open necklines draw the eye upward and lengthen the neck.");
  if (h) {
    if (h < 160) {
      if (/midi|maxi/.test(all)) tips.push("With a midi or maxi length, a little heel or shoes close to your skin tone keep the proportions light.");
      if (/wide-leg|full-length/.test(all)) tips.push("Let wide trousers graze the floor over a heel for an unbroken leg line.");
    } else if (h > 172) {
      if (/midi|maxi|wide-leg/.test(all)) tips.push("Your height carries long lengths and volume easily — flats work as well as heels.");
      tips.push("Cropped jackets and belts are a fun way to play with proportions.");
    } else if (/midi/.test(all)) {
      tips.push("A midi that ends at mid-calf works well with both flats and heels.");
    }
  }
  return Array.from(new Set(tips)).slice(0, 4);
}

// ---------------------------------------------------------------------------
// Photo prompts — every garment image is a photorealistic product shot.
// ---------------------------------------------------------------------------
export function productPrompt(p: { name: string; fabric?: string; neckline?: string; fit?: string; silhouette?: string; length?: string; shadeHex?: string; detail?: string; category?: Category }) {
  const bits = [p.name, p.fabric && !p.name.toLowerCase().includes(p.fabric.toLowerCase()) ? `in ${p.fabric}` : "", p.length && !p.name.toLowerCase().includes(p.length.toLowerCase()) ? `${p.length.toLowerCase()} length` : "", p.detail ? `with ${p.detail.toLowerCase()}` : "", p.shadeHex ? `colour close to ${p.shadeHex}` : ""].filter(Boolean).join(", ");
  const shoe = p.category && ["sneakers", "loafers", "heels", "boots", "flats", "sandals", "juttis", "kolhapuris"].includes(p.category);
  const acc = p.category && ["earrings", "jhumkas", "necklace", "bangles", "ring", "watch", "bag", "clutch", "potli", "belt", "scarf", "sunglasses"].includes(p.category);
  const staging = shoe ? "a single pair shown at a three-quarter angle" : acc ? "a single item, centred" : "shown on an invisible ghost mannequin, front view";
  return `Professional e-commerce product photograph of a ${bits}. ${staging}, plain light grey seamless studio background, soft even lighting, realistic fabric texture, folds and stitching, sharp focus, no person, no model, no text, no logo.`;
}

export function optionToGarment(o: Option): Garment {
  return { id: o.id, name: o.name, category: o.category, color: o.color, colorHex: o.colorHex, fabric: o.fabric, fit: o.fit, silhouette: o.silhouette, neckline: o.neckline };
}
