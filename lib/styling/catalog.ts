import type { Category, Season } from "../types";

/**
 * A styling vocabulary: pieces a stylist reaches for, with the direction(s) they serve.
 * dir = affinity for [minimal, casual, bold, contemporary], 0–3.
 * formal = 1 (very casual) … 5 (black tie / bridal).
 * price = 1 accessible · 2 mid · 3 investment.
 * color = how the piece takes its colour from the look palette.
 */
export type ColorRole = "base" | "accent" | "metal" | "shoe" | "denim" | { fixed: string };
export type Ctx = "western" | "indian" | "both";

export interface ItemT {
  key: string;
  cat: Category;
  name: string; // colour is prefixed automatically unless the name already carries one
  dir: [number, number, number, number];
  formal: number;
  price: 1 | 2 | 3;
  ctx: Ctx;
  color: ColorRole;
  fabric?: string;
  fit?: string;
  silhouette?: string;
  length?: string;
  pattern?: string;
  seasons?: Season[];
  note?: string;
  /** colour name is part of the label (e.g. "white sneakers") */
  fixedLabel?: boolean;
}

const W: Ctx = "western";
const I: Ctx = "indian";
const B: Ctx = "both";

export const CATALOG: ItemT[] = [
  // ---------- Western tops ----------
  { key: "crisp-shirt", cat: "shirt", name: "crisp poplin shirt", fabric: "cotton", fit: "fitted", dir: [3, 2, 1, 2], formal: 3, price: 1, ctx: B, color: "base", note: "A tucked-in shirt changes the entire look." },
  { key: "oversized-shirt", cat: "shirt", name: "oversized poplin shirt", fabric: "cotton", fit: "oversized", dir: [2, 3, 1, 3], formal: 2, price: 1, ctx: B, color: "base", note: "Half-tuck the front, leave the back loose." },
  { key: "linen-shirt", cat: "shirt", name: "relaxed linen shirt", fabric: "linen", fit: "relaxed", dir: [2, 3, 0, 1], formal: 2, price: 2, ctx: W, color: "base", seasons: ["spring", "summer"], note: "Roll the sleeves twice — it reads effortless." },
  { key: "satin-cami", cat: "camisole", name: "satin camisole", fabric: "satin", fit: "fitted", dir: [2, 1, 2, 3], formal: 3, price: 1, ctx: W, color: "base", note: "A sliver of sheen under structure." },
  { key: "knit-top", cat: "knit", name: "fine-gauge knit top", fabric: "knit", fit: "fitted", dir: [3, 2, 0, 2], formal: 3, price: 2, ctx: W, color: "base" },
  { key: "ribbed-tank", cat: "tank", name: "ribbed tank top", fabric: "cotton", fit: "fitted", dir: [2, 3, 1, 2], formal: 1, price: 1, ctx: W, color: "base" },
  { key: "heavy-tee", cat: "tshirt", name: "heavyweight tee", fabric: "cotton", fit: "relaxed", dir: [2, 3, 0, 2], formal: 1, price: 1, ctx: W, color: "base" },
  { key: "graphic-tee", cat: "tshirt", name: "vintage graphic tee", fabric: "cotton", fit: "oversized", pattern: "graphic", dir: [0, 3, 2, 2], formal: 1, price: 1, ctx: W, color: "base" },
  { key: "turtleneck", cat: "knit", name: "merino turtleneck", fabric: "wool", fit: "fitted", dir: [3, 1, 1, 3], formal: 3, price: 2, ctx: W, color: "base", seasons: ["autumn", "winter"], note: "A high neck sharpens tailoring." },
  { key: "corset-top", cat: "top", name: "structured corset top", fabric: "satin", fit: "fitted", dir: [0, 0, 3, 3], formal: 3, price: 2, ctx: W, color: "accent", note: "Try a little contrast here." },
  { key: "organza-blouse", cat: "blouse", name: "sheer organza blouse", fabric: "organza", fit: "relaxed", dir: [1, 0, 3, 3], formal: 3, price: 2, ctx: W, color: "accent" },
  { key: "silk-blouse", cat: "blouse", name: "fluid silk blouse", fabric: "silk", fit: "relaxed", dir: [3, 1, 1, 2], formal: 4, price: 3, ctx: W, color: "base" },
  { key: "cable-knit", cat: "knit", name: "cable-knit sweater", fabric: "wool", fit: "relaxed", dir: [1, 3, 0, 1], formal: 2, price: 2, ctx: W, color: "base", seasons: ["autumn", "winter"] },
  { key: "bodysuit", cat: "top", name: "square-neck bodysuit", fabric: "knit", fit: "fitted", dir: [2, 2, 1, 3], formal: 2, price: 1, ctx: W, color: "base" },
  { key: "print-shirt", cat: "shirt", name: "printed silk shirt", fabric: "silk", fit: "relaxed", pattern: "abstract", dir: [0, 1, 3, 2], formal: 3, price: 2, ctx: W, color: "accent", note: "Let the print carry the colour." },
  { key: "knit-polo", cat: "knit", name: "knitted polo", fabric: "knit", fit: "regular", dir: [2, 2, 1, 3], formal: 2, price: 2, ctx: W, color: "base" },
  { key: "striped-tee", cat: "tshirt", name: "breton stripe tee", fabric: "cotton", pattern: "stripes", fit: "regular", dir: [1, 3, 1, 2], formal: 1, price: 1, ctx: W, color: "base" },

  // ---------- Western bottoms ----------
  { key: "wide-trousers", cat: "trousers", name: "wide-leg trousers", fabric: "wool", fit: "tailored", silhouette: "wide-leg", length: "full-length", dir: [3, 1, 1, 3], formal: 4, price: 2, ctx: B, color: "base", note: "A floor-skimming hem lengthens the line." },
  { key: "straight-jeans", cat: "jeans", name: "straight-fit jeans", fabric: "denim", fit: "straight", dir: [2, 3, 1, 2], formal: 1, price: 1, ctx: B, color: "denim" },
  { key: "baggy-jeans", cat: "jeans", name: "light-wash baggy jeans", fabric: "denim", fit: "relaxed", dir: [0, 3, 2, 3], formal: 1, price: 1, ctx: W, color: { fixed: "light wash" }, fixedLabel: true },
  { key: "tailored-shorts", cat: "shorts", name: "tailored shorts", fabric: "linen", fit: "tailored", dir: [2, 2, 1, 3], formal: 2, price: 1, ctx: W, color: "base", seasons: ["spring", "summer"] },
  { key: "satin-midi", cat: "skirt", name: "bias-cut satin midi skirt", fabric: "satin", silhouette: "bias-cut", length: "midi", dir: [2, 1, 2, 3], formal: 3, price: 2, ctx: W, color: "base", note: "Fluid fabric moves when you walk." },
  { key: "pleated-midi", cat: "skirt", name: "pleated midi skirt", fabric: "crepe", silhouette: "pleated", length: "midi", dir: [2, 2, 2, 2], formal: 3, price: 2, ctx: W, color: "base" },
  { key: "leather-mini", cat: "skirt", name: "leather mini skirt", fabric: "leather", length: "mini", dir: [0, 1, 3, 3], formal: 2, price: 2, ctx: W, color: "base" },
  { key: "cigarette", cat: "trousers", name: "cigarette trousers", fabric: "crepe", fit: "slim", silhouette: "tapered", dir: [3, 1, 0, 2], formal: 4, price: 2, ctx: W, color: "base" },
  { key: "cargo", cat: "trousers", name: "parachute cargo trousers", fabric: "cotton", fit: "relaxed", dir: [0, 3, 2, 3], formal: 1, price: 1, ctx: W, color: "base" },
  { key: "denim-skirt", cat: "skirt", name: "denim midi skirt", fabric: "denim", length: "midi", dir: [1, 3, 1, 2], formal: 1, price: 1, ctx: W, color: "denim" },
  { key: "pencil-skirt", cat: "skirt", name: "pencil skirt", fabric: "wool", fit: "fitted", length: "knee", dir: [3, 0, 0, 1], formal: 4, price: 2, ctx: W, color: "base" },
  { key: "satin-trousers", cat: "trousers", name: "satin wide trousers", fabric: "satin", silhouette: "wide-leg", dir: [1, 1, 3, 2], formal: 3, price: 2, ctx: W, color: "accent", note: "Colour on the leg, quiet on top." },

  // ---------- Western one-pieces ----------
  { key: "slip-dress", cat: "dress", name: "bias-cut slip dress", fabric: "satin", length: "midi", dir: [2, 1, 2, 3], formal: 3, price: 2, ctx: W, color: "base" },
  { key: "shirt-dress", cat: "dress", name: "belted shirt dress", fabric: "cotton", length: "midi", dir: [3, 3, 0, 1], formal: 2, price: 2, ctx: W, color: "base" },
  { key: "knit-dress", cat: "dress", name: "ribbed knit midi dress", fabric: "knit", length: "midi", dir: [3, 2, 0, 2], formal: 3, price: 2, ctx: W, color: "base" },
  { key: "jumpsuit", cat: "jumpsuit", name: "tailored jumpsuit", fabric: "crepe", dir: [3, 1, 1, 3], formal: 3, price: 2, ctx: W, color: "base" },

  // ---------- Western layers ----------
  { key: "oversized-blazer", cat: "blazer", name: "oversized blazer", fabric: "wool", fit: "oversized", dir: [3, 1, 1, 3], formal: 4, price: 2, ctx: B, color: "base", note: "Balance the oversized silhouette." },
  { key: "boucle-jacket", cat: "jacket", name: "cropped bouclé jacket", fabric: "tweed", fit: "boxy", dir: [1, 0, 2, 3], formal: 3, price: 3, ctx: W, color: "base" },
  { key: "denim-jacket", cat: "jacket", name: "denim jacket", fabric: "denim", fit: "regular", dir: [0, 3, 1, 1], formal: 1, price: 1, ctx: B, color: "denim" },
  { key: "biker", cat: "jacket", name: "black leather biker jacket", fabric: "leather", fit: "fitted", dir: [0, 2, 3, 2], formal: 2, price: 3, ctx: W, color: { fixed: "black" }, fixedLabel: true, note: "Hardware against softness." },
  { key: "trench", cat: "coat", name: "trench coat", fabric: "cotton", fit: "relaxed", length: "midi", dir: [3, 2, 0, 2], formal: 3, price: 3, ctx: B, color: "base", seasons: ["spring", "autumn", "monsoon"], note: "Belt it, don't button it." },
  { key: "long-coat", cat: "coat", name: "longline wool coat", fabric: "wool", length: "maxi", dir: [3, 1, 1, 3], formal: 4, price: 3, ctx: W, color: "base", seasons: ["autumn", "winter"] },
  { key: "cardigan", cat: "knit", name: "cashmere cardigan, worn over the shoulders", fabric: "cashmere", dir: [2, 2, 0, 2], formal: 3, price: 3, ctx: W, color: "base" },

  // ---------- Indian ----------
  { key: "blouse-highneck", cat: "saree-blouse", name: "sleeveless high-neck blouse", fabric: "silk", fit: "fitted", dir: [3, 1, 1, 3], formal: 4, price: 2, ctx: I, color: "base", note: "A high neck lets the drape be the hero." },
  { key: "blouse-puff", cat: "saree-blouse", name: "puff-sleeve blouse", fabric: "cotton", fit: "fitted", dir: [1, 3, 2, 2], formal: 3, price: 1, ctx: I, color: "base" },
  { key: "blouse-deepback", cat: "saree-blouse", name: "embroidered deep-back blouse", fabric: "silk", pattern: "embroidered", dir: [1, 0, 3, 2], formal: 5, price: 3, ctx: I, color: "accent", note: "Save the drama for the back." },
  { key: "blouse-brocade", cat: "saree-blouse", name: "contrast brocade blouse", fabric: "banarasi silk", pattern: "embroidered", dir: [0, 1, 3, 2], formal: 4, price: 2, ctx: I, color: "accent", note: "Try a little contrast here." },
  { key: "blouse-shirt", cat: "saree-blouse", name: "crisp shirt-style blouse", fabric: "cotton", fit: "tailored", dir: [2, 1, 1, 3], formal: 3, price: 1, ctx: I, color: { fixed: "white" }, note: "A shirt instead of a choli — instantly modern." },
  { key: "blouse-corset", cat: "saree-blouse", name: "structured corset blouse", fabric: "satin", fit: "fitted", dir: [0, 0, 3, 3], formal: 4, price: 2, ctx: I, color: "base" },
  { key: "blouse-boatneck", cat: "saree-blouse", name: "boat-neck elbow-sleeve blouse", fabric: "silk", dir: [2, 2, 0, 1], formal: 4, price: 2, ctx: I, color: "base" },
  { key: "palazzo", cat: "palazzo", name: "straight palazzo", fabric: "cotton", silhouette: "wide-leg", dir: [2, 3, 1, 2], formal: 2, price: 1, ctx: I, color: "base" },
  { key: "churidar", cat: "churidar", name: "fitted churidar", fabric: "cotton", fit: "slim", dir: [2, 2, 0, 1], formal: 3, price: 1, ctx: I, color: "base" },
  { key: "sharara", cat: "palazzo", name: "flared sharara", fabric: "georgette", silhouette: "flared", dir: [0, 1, 3, 2], formal: 4, price: 2, ctx: I, color: "base" },
  { key: "dhoti", cat: "palazzo", name: "draped dhoti pants", fabric: "silk", silhouette: "draped", dir: [0, 1, 2, 3], formal: 3, price: 2, ctx: I, color: "base" },
  { key: "dupatta-organza", cat: "dupatta", name: "sheer organza dupatta", fabric: "organza", dir: [2, 1, 1, 3], formal: 4, price: 2, ctx: I, color: "base" },
  { key: "dupatta-banarasi", cat: "dupatta", name: "Banarasi silk dupatta", fabric: "banarasi silk", pattern: "zari border", dir: [0, 1, 3, 2], formal: 5, price: 3, ctx: I, color: "accent" },
  { key: "dupatta-mul", cat: "dupatta", name: "soft mul cotton dupatta", fabric: "cotton", dir: [1, 3, 0, 1], formal: 2, price: 1, ctx: I, color: "base" },
  { key: "dupatta-phulkari", cat: "dupatta", name: "phulkari dupatta", fabric: "cotton", pattern: "embroidered", dir: [0, 2, 3, 2], formal: 3, price: 2, ctx: I, color: "accent", note: "Let the embroidery bring the colour." },
  { key: "saree-handloom", cat: "saree", name: "handloom cotton saree", fabric: "cotton", dir: [2, 3, 0, 2], formal: 3, price: 1, ctx: I, color: "base" },
  { key: "saree-chiffon", cat: "saree", name: "fluid chiffon saree", fabric: "chiffon", dir: [2, 1, 2, 3], formal: 4, price: 2, ctx: I, color: "base" },
  { key: "saree-kanjeevaram", cat: "saree", name: "Kanjeevaram silk saree", fabric: "kanjeevaram silk", pattern: "zari border", dir: [1, 0, 3, 2], formal: 5, price: 3, ctx: I, color: "accent" },
  { key: "lehenga-silk", cat: "lehenga", name: "minimal raw-silk lehenga", fabric: "silk", dir: [3, 0, 1, 3], formal: 4, price: 3, ctx: I, color: "base" },
  { key: "lehenga-embroidered", cat: "lehenga", name: "embroidered lehenga", fabric: "georgette", pattern: "embroidered", dir: [0, 0, 3, 2], formal: 5, price: 3, ctx: I, color: "accent" },
  { key: "nehru", cat: "ethnic-jacket", name: "Nehru jacket", fabric: "silk", fit: "tailored", dir: [2, 1, 1, 2], formal: 4, price: 2, ctx: I, color: "base" },
  { key: "koti", cat: "ethnic-jacket", name: "embroidered short koti", fabric: "velvet", pattern: "embroidered", dir: [0, 1, 3, 3], formal: 4, price: 2, ctx: I, color: "accent" },
  { key: "kurta-straight", cat: "kurta", name: "straight cotton kurta", fabric: "cotton", length: "knee", dir: [2, 3, 0, 1], formal: 2, price: 1, ctx: I, color: "base" },
  { key: "kurta-chikan", cat: "kurta", name: "chikankari kurta", fabric: "cotton", pattern: "embroidered", dir: [3, 2, 0, 2], formal: 3, price: 2, ctx: I, color: "base" },
  { key: "kurti-short", cat: "kurti", name: "short block-print kurti", fabric: "cotton", pattern: "block print", dir: [1, 3, 1, 2], formal: 1, price: 1, ctx: I, color: "base" },

  // ---------- Footwear ----------
  { key: "white-sneakers", cat: "sneakers", name: "white leather sneakers", dir: [2, 3, 0, 2], formal: 1, price: 1, ctx: W, color: { fixed: "white" }, fixedLabel: true, note: "Clean sneakers make tailoring wearable." },
  { key: "loafers", cat: "loafers", name: "leather loafers", dir: [3, 2, 0, 2], formal: 3, price: 2, ctx: W, color: "shoe" },
  { key: "slingbacks", cat: "heels", name: "kitten-heel slingbacks", dir: [2, 0, 1, 3], formal: 4, price: 2, ctx: B, color: "shoe" },
  { key: "pumps", cat: "heels", name: "pointed-toe pumps", dir: [3, 0, 1, 2], formal: 5, price: 2, ctx: W, color: "shoe", note: "Point the toe — it lengthens the leg." },
  { key: "ankle-boots", cat: "boots", name: "ankle boots", fabric: "leather", dir: [1, 2, 2, 2], formal: 3, price: 2, ctx: W, color: "shoe", seasons: ["autumn", "winter", "monsoon"] },
  { key: "strappy", cat: "sandals", name: "strappy sandals", dir: [1, 1, 2, 2], formal: 3, price: 1, ctx: B, color: "shoe", seasons: ["spring", "summer"] },
  { key: "ballet", cat: "flats", name: "ballet flats", dir: [2, 2, 0, 3], formal: 2, price: 1, ctx: W, color: "shoe" },
  { key: "knee-boots", cat: "boots", name: "knee-high boots", fabric: "leather", dir: [0, 1, 3, 3], formal: 3, price: 3, ctx: W, color: "shoe", seasons: ["autumn", "winter"] },
  { key: "metallic-heels", cat: "heels", name: "metallic strappy heels", dir: [0, 0, 3, 2], formal: 4, price: 2, ctx: B, color: "metal", note: "Metallics act as a neutral." },
  { key: "juttis", cat: "juttis", name: "embroidered juttis", pattern: "embroidered", dir: [1, 2, 2, 2], formal: 3, price: 1, ctx: I, color: "metal" },
  { key: "kolhapuris", cat: "kolhapuris", name: "tan leather kolhapuris", dir: [2, 3, 0, 1], formal: 2, price: 1, ctx: I, color: { fixed: "camel" }, fixedLabel: true },
  { key: "block-sandals", cat: "sandals", name: "block-heel sandals", dir: [2, 1, 1, 2], formal: 3, price: 1, ctx: I, color: "metal" },

  // ---------- Jewellery ----------
  { key: "gold-hoops", cat: "earrings", name: "gold hoops", dir: [2, 2, 2, 2], formal: 2, price: 1, ctx: W, color: { fixed: "gold" }, fixedLabel: true, note: "Add a gold accent." },
  { key: "silver-cuff", cat: "bangles", name: "sculptural silver cuff", dir: [1, 1, 2, 3], formal: 3, price: 2, ctx: W, color: { fixed: "silver" }, fixedLabel: true },
  { key: "fine-chain", cat: "necklace", name: "fine chain necklace", dir: [3, 2, 0, 2], formal: 3, price: 1, ctx: W, color: "metal" },
  { key: "pearl-drops", cat: "earrings", name: "pearl drop earrings", dir: [2, 1, 1, 3], formal: 4, price: 2, ctx: B, color: { fixed: "pearl" }, fixedLabel: true },
  { key: "statement-earrings", cat: "earrings", name: "sculptural statement earrings", dir: [0, 0, 3, 2], formal: 3, price: 2, ctx: W, color: "metal" },
  { key: "signet", cat: "ring", name: "signet ring", dir: [2, 2, 1, 2], formal: 2, price: 1, ctx: W, color: "metal" },
  { key: "layered-chains", cat: "necklace", name: "layered chains", dir: [0, 2, 2, 3], formal: 2, price: 1, ctx: W, color: "metal" },
  { key: "studs", cat: "earrings", name: "minimal diamond studs", dir: [3, 1, 0, 2], formal: 4, price: 3, ctx: B, color: { fixed: "silver" }, fixedLabel: true },
  { key: "gold-jhumkas", cat: "jhumkas", name: "gold jhumkas", dir: [1, 2, 2, 1], formal: 4, price: 2, ctx: I, color: { fixed: "gold" }, fixedLabel: true },
  { key: "oxidised-jhumkas", cat: "jhumkas", name: "oxidised silver jhumkas", dir: [0, 3, 2, 2], formal: 2, price: 1, ctx: I, color: { fixed: "silver" }, fixedLabel: true, note: "Oxidised silver keeps it relaxed." },
  { key: "temple-necklace", cat: "necklace", name: "temple gold necklace", dir: [0, 0, 3, 2], formal: 5, price: 3, ctx: I, color: { fixed: "gold" }, fixedLabel: true },
  { key: "pearl-choker", cat: "necklace", name: "pearl choker", dir: [2, 1, 1, 3], formal: 4, price: 2, ctx: I, color: { fixed: "pearl" }, fixedLabel: true, note: "Pearls soften a strong colour." },
  { key: "polki", cat: "jhumkas", name: "polki chandbalis", dir: [1, 0, 3, 2], formal: 5, price: 3, ctx: I, color: { fixed: "gold" } },
  { key: "glass-bangles", cat: "bangles", name: "stacked glass bangles", dir: [0, 2, 3, 1], formal: 3, price: 1, ctx: I, color: "accent" },
  { key: "gold-kada", cat: "bangles", name: "slim gold kada", dir: [3, 1, 0, 2], formal: 3, price: 2, ctx: I, color: { fixed: "gold" }, fixedLabel: true },

  // ---------- Bags ----------
  { key: "structured-bag", cat: "bag", name: "structured top-handle bag", fabric: "leather", dir: [3, 1, 1, 2], formal: 4, price: 3, ctx: W, color: "shoe" },
  { key: "tote", cat: "bag", name: "slouchy leather tote", fabric: "leather", dir: [1, 3, 0, 1], formal: 2, price: 2, ctx: W, color: "shoe" },
  { key: "baguette", cat: "bag", name: "baguette shoulder bag", dir: [1, 1, 2, 3], formal: 3, price: 2, ctx: W, color: "base" },
  { key: "mini-bag", cat: "bag", name: "mini bag", dir: [0, 1, 3, 2], formal: 3, price: 2, ctx: W, color: "accent", note: "One small hit of colour." },
  { key: "crossbody", cat: "bag", name: "canvas crossbody", dir: [1, 3, 0, 1], formal: 1, price: 1, ctx: W, color: "shoe" },
  { key: "box-clutch", cat: "clutch", name: "metallic box clutch", dir: [2, 0, 2, 3], formal: 4, price: 2, ctx: B, color: "metal" },
  { key: "potli", cat: "potli", name: "embroidered potli", pattern: "embroidered", dir: [0, 2, 3, 2], formal: 4, price: 1, ctx: I, color: "accent" },

  // ---------- Accessories ----------
  { key: "leather-belt", cat: "belt", name: "slim leather belt", fabric: "leather", dir: [3, 2, 0, 2], formal: 3, price: 1, ctx: W, color: "shoe", note: "A belt defines the waist." },
  { key: "statement-belt", cat: "belt", name: "statement buckle belt", dir: [0, 1, 3, 2], formal: 3, price: 2, ctx: B, color: "shoe" },
  { key: "silk-scarf", cat: "scarf", name: "printed silk scarf", fabric: "silk", pattern: "abstract", dir: [1, 1, 2, 2], formal: 3, price: 2, ctx: W, color: "accent" },
  { key: "sunglasses", cat: "sunglasses", name: "black acetate sunglasses", dir: [2, 3, 1, 2], formal: 2, price: 1, ctx: W, color: { fixed: "black" }, fixedLabel: true },
  { key: "watch", cat: "watch", name: "slim leather-strap watch", dir: [3, 2, 0, 1], formal: 3, price: 2, ctx: W, color: "shoe" },
];

export const CATALOG_BY_KEY = new Map(CATALOG.map((i) => [i.key, i]));
