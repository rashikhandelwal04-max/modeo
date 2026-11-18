/**
 * MY GALA rule-based styling engine.
 *
 * Deterministic (seeded) and fully offline. It reasons about colour theory, proportion,
 * texture, formality, season, user preferences, learned affinity, repetition and
 * wardrobe availability. When ANTHROPIC_API_KEY is configured, /api/style uses Claude
 * instead and falls back to this engine on any failure.
 */
import { CATALOG, type ItemT, type ColorRole } from "./catalog";
import {
  analogous, cap, complements, hexOf, isDark, isLight, isNeutral, metalFor, pairings, partnerNeutrals,
} from "../colors";
import { CATEGORIES, categoryLabel, familyOf, roleOf } from "../taxonomy";
import type {
  Annotation, Category, Direction, Garment, Look, LookMeta, Nudge, Palette, Piece, Role, Season,
  StyleProfile, WardrobeItem,
} from "../types";
import { hashStr, rng, uid } from "../util";

export const DIRECTIONS: Direction[] = ["minimal", "casual", "bold", "contemporary"];
const DIR_INDEX: Record<Direction, number> = { minimal: 0, casual: 1, bold: 2, contemporary: 3 };

export const DIRECTION_LABEL: Record<Direction, string> = {
  minimal: "Minimal & sophisticated",
  casual: "Casual & effortless",
  bold: "Bold & experimental",
  contemporary: "Contemporary & fashion-forward",
};

export interface EngineInput {
  anchor: Garment;
  anchorOwned?: boolean;
  nudges?: Nudge[];
  seed?: number;
  wardrobe?: WardrobeItem[];
  mode?: "explore" | "wardrobe";
  profile?: Partial<StyleProfile>;
  occasion?: string;
  season?: Season;
  directions?: Direction[];
}

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------
interface Cand {
  key: string;
  item: ItemT;
  owned?: WardrobeItem;
}

type SlotKind =
  | "top" | "bottom" | "layer" | "blouse" | "drape" | "dupatta" | "footwear"
  | "jewellery" | "earrings" | "necklace" | "bangles" | "bag" | "accessory" | "onepiece" | "kurta";

interface SlotSpec {
  slot: string;
  kind: SlotKind;
  optional?: boolean;
}

const KIND_CATS: Record<SlotKind, Category[]> = {
  top: ["shirt", "tshirt", "top", "camisole", "tank", "knit", "blouse", "kurti"],
  bottom: ["trousers", "jeans", "shorts", "skirt", "palazzo", "churidar"],
  layer: ["blazer", "jacket", "coat", "ethnic-jacket", "knit"],
  blouse: ["saree-blouse"],
  drape: ["saree", "lehenga"],
  dupatta: ["dupatta"],
  footwear: ["sneakers", "loafers", "heels", "boots", "flats", "sandals", "juttis", "kolhapuris"],
  jewellery: ["earrings", "jhumkas", "necklace", "bangles", "ring"],
  earrings: ["earrings", "jhumkas"],
  necklace: ["necklace"],
  bangles: ["bangles", "ring"],
  bag: ["bag", "clutch", "potli"],
  accessory: ["belt", "scarf", "sunglasses", "watch"],
  onepiece: ["dress", "jumpsuit"],
  kurta: ["kurta", "salwar-suit", "indo-western"],
};

export const SLOT_LABEL: Record<SlotKind, string> = {
  top: "Tops", bottom: "Bottoms", layer: "Layers", blouse: "Blouse styles", drape: "Drapes",
  dupatta: "Dupattas", footwear: "Shoes", jewellery: "Jewellery", earrings: "Earrings",
  necklace: "Necklaces", bangles: "Bangles & rings", bag: "Bags", accessory: "Accessories",
  onepiece: "Dresses", kurta: "Kurtas",
};

function kindOfSlot(slot: string): SlotKind {
  return slot.replace(/-\d+$/, "") as SlotKind;
}

const LAYER_KEYS_IN_KNIT = new Set(["cardigan"]);

function poolFor(kind: SlotKind, ctx: "western" | "indian", input: EngineInput): Cand[] {
  const cats = new Set(KIND_CATS[kind]);
  const out: Cand[] = [];
  const mode = input.mode ?? "explore";
  // owned items first
  for (const w of input.wardrobe ?? []) {
    if (w.id === input.anchor.id) continue;
    if (!cats.has(w.category)) continue;
    if (kind === "layer" && w.category === "knit" && !/cardigan/i.test(w.name)) continue;
    if (kind === "top" && w.category === "knit" && /cardigan/i.test(w.name)) continue;
    out.push({ key: "own:" + w.id, item: ownedToItem(w), owned: w });
  }
  if (mode === "wardrobe") return out;
  for (const it of CATALOG) {
    if (!cats.has(it.cat)) continue;
    if (kind === "layer" && it.cat === "knit" && !LAYER_KEYS_IN_KNIT.has(it.key)) continue;
    if (kind === "top" && LAYER_KEYS_IN_KNIT.has(it.key)) continue;
    if (it.ctx !== "both" && it.ctx !== ctx) {
      // indo-western crossover: allow a few western bottoms/layers with Indian tops
      const crossover = ctx === "indian" && (kind === "bottom" || kind === "layer") && ["straight-jeans", "wide-trousers", "cigarette"].includes(it.key);
      const westernTopWithIndianBottom = ctx === "indian" && kind === "top" && ["crisp-shirt", "oversized-shirt", "bodysuit"].includes(it.key);
      if (!crossover && !westernTopWithIndianBottom) continue;
    }
    out.push({ key: it.key, item: it });
  }
  return out;
}

function ownedToItem(w: WardrobeItem): ItemT {
  const styles = (w.style ?? []).map((s) => s.toLowerCase());
  const dir: [number, number, number, number] = [2, 2, 1, 2];
  if (styles.some((s) => ["minimal", "classic"].includes(s))) dir[0] = 3;
  if (styles.some((s) => ["sporty", "streetwear", "bohemian"].includes(s))) dir[1] = 3;
  if (styles.some((s) => ["edgy", "glam"].includes(s))) dir[2] = 3;
  if (styles.some((s) => ["contemporary", "romantic"].includes(s))) dir[3] = 3;
  if (!isNeutral(w.color)) dir[2] += 1;
  return {
    key: "own:" + w.id,
    cat: w.category,
    name: w.name,
    dir,
    formal: formalityOf(w),
    price: 1,
    ctx: familyOf(w.category) === "indian" ? "indian" : "both",
    color: { fixed: w.color },
    fabric: w.fabric,
    fit: w.fit,
    silhouette: w.silhouette,
    length: w.length,
    pattern: w.pattern,
    seasons: w.season,
    fixedLabel: true,
  };
}

// ---------------------------------------------------------------------------
// Formality
// ---------------------------------------------------------------------------
const FABRIC_FORMALITY: Record<string, number> = {
  silk: 4, satin: 4, velvet: 4.5, "banarasi silk": 4.8, "kanjeevaram silk": 5, organza: 4.2, chiffon: 3.8,
  georgette: 3.8, wool: 3.5, cashmere: 3.6, crepe: 3.5, tweed: 3.4, leather: 2.8, suede: 2.8, chanderi: 3.6,
  cotton: 2.4, linen: 2.4, khadi: 2.4, denim: 1.5, knit: 2.2, polyester: 2.5,
};
const CATEGORY_FORMALITY: Partial<Record<Category, number>> = {
  saree: 4, lehenga: 5, "salwar-suit": 3.2, kurta: 2.8, kurti: 2, blazer: 3.8, coat: 3.5, jacket: 2.2,
  tshirt: 1.2, tank: 1.4, jeans: 1.5, shorts: 1.5, sneakers: 1, heels: 4, loafers: 3, dress: 3, jumpsuit: 3,
  shirt: 3, trousers: 3.4, skirt: 3, camisole: 3, knit: 2.6, "ethnic-jacket": 3.8, "saree-blouse": 4,
  clutch: 4, potli: 4, jhumkas: 3.6,
};
const OCCASION_FORMALITY: Record<string, number> = {
  wedding: 5, festive: 4.5, formal: 4.5, interview: 4, work: 3.4, party: 3.6, "date night": 3.6,
  brunch: 2.5, travel: 2, casual: 1.5, college: 1.5, weekend: 1.6,
};

export function formalityOf(g: Partial<Garment>): number {
  const vals: number[] = [];
  if (g.category && CATEGORY_FORMALITY[g.category] != null) vals.push(CATEGORY_FORMALITY[g.category]!);
  if (g.fabric && FABRIC_FORMALITY[g.fabric] != null) vals.push(FABRIC_FORMALITY[g.fabric]);
  for (const o of g.occasion ?? []) if (OCCASION_FORMALITY[o] != null) vals.push(OCCASION_FORMALITY[o]);
  if (g.detail && /gold|zari|embroider|sequin/.test(g.detail)) vals.push(4.5);
  if (!vals.length) return 3;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
function pick<T>(arr: T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length) % arr.length];
}

export function buildPalette(anchor: Garment, dir: Direction, input: EngineInput, r: () => number): Palette {
  const A = anchor.color;
  const avoid = new Set(input.profile?.avoidColors ?? []);
  const fav = (input.profile?.colors ?? []).filter((c) => !avoid.has(c));
  const ok = (c?: string) => !!c && !avoid.has(c) && c !== A;
  const N = partnerNeutrals(A).filter(ok);
  const C = complements(A).filter(ok);
  const An = analogous(A).filter(ok);
  const nudges = new Set(input.nudges ?? []);
  const favIn = (list: string[]) => fav.find((f) => list.includes(f));
  const metal = metalFor(A);
  const shoeDefault = isDark(A) || A === "grey" || A === "charcoal" ? "black" : metal === "gold" ? "camel" : "black";

  let pal: Palette;
  switch (dir) {
    case "minimal": {
      const base = [N[0] ?? "white", N[1] ?? N[0] ?? "black"];
      pal = { base, accent: N[2] ?? base[0], metal, shoe: isDark(A) ? "black" : shoeDefault, denim: "navy" };
      break;
    }
    case "casual": {
      const light = A === "white" ? "ivory" : "white";
      const denim = A === "denim blue" || A === "light wash" ? "white" : "denim blue";
      pal = { base: [light, denim], accent: N[1] ?? "beige", metal, shoe: pick(["white", "camel"], r), denim };
      break;
    }
    case "bold": {
      const accent = favIn(C) ?? pick(C.length ? C : ["red"], r);
      const anchor2 = isDark(A) ? "white" : "black";
      pal = { base: [accent, anchor2], accent, metal: "gold", shoe: pick([accent, "black"], r), denim: "denim blue" };
      break;
    }
    case "contemporary": {
      const tonal = favIn(An) ?? An[0] ?? N[0] ?? "grey";
      const accent = favIn(C) ?? C[1] ?? C[0] ?? "burgundy";
      pal = { base: [tonal, N[0] ?? "ivory"], accent, metal: metal === "gold" ? "silver" : "gold", shoe: pick(["black", tonal], r), denim: "denim blue" };
      break;
    }
  }
  if (nudges.has("colourful")) {
    pal.base = [C[0] ?? pal.base[0], pal.base[0]];
    pal.accent = C[1] ?? C[0] ?? pal.accent;
  }
  if (nudges.has("minimal")) {
    pal.accent = N[0] ?? pal.accent;
    if (!isNeutral(pal.base[0])) pal.base = [N[0] ?? "white", N[1] ?? "black"];
  }
  if (nudges.has("elegant") || nudges.has("formal")) {
    if (pal.shoe === "white") pal.shoe = "black";
  }
  if (anchor.detail && /gold/.test(anchor.detail)) pal.metal = "gold";
  if (anchor.detail && /silver/.test(anchor.detail)) pal.metal = "silver";
  return pal;
}

function colorFor(role: ColorRole, pal: Palette, baseIdx: number, anchorColor: string): string {
  if (typeof role === "object") return role.fixed;
  switch (role) {
    case "base": {
      const b = pal.base[baseIdx % pal.base.length];
      return b === anchorColor && pal.base.length > 1 ? pal.base[(baseIdx + 1) % pal.base.length] : b;
    }
    case "accent": return pal.accent;
    case "metal": return pal.metal;
    case "shoe": return pal.shoe;
    case "denim": return pal.denim;
  }
}

function labelFor(item: ItemT, colorName: string) {
  if (item.fixedLabel) return cap(item.name);
  return cap(`${colorName} ${item.name}`);
}

function toGarment(c: Cand, colorName: string): Garment {
  if (c.owned) return c.owned;
  const it = c.item;
  return {
    id: uid(),
    name: labelFor(it, colorName),
    category: it.cat,
    color: colorName,
    colorHex: hexOf(colorName),
    fabric: it.fabric,
    fit: it.fit,
    silhouette: it.silhouette,
    length: it.length,
    pattern: it.pattern,
    season: it.seasons,
  };
}

// ---------------------------------------------------------------------------
// Slot planning
// ---------------------------------------------------------------------------
function contextOf(anchor: Garment): "western" | "indian" {
  if (familyOf(anchor.category) === "indian") return "indian";
  if (["jhumkas", "juttis", "kolhapuris", "potli"].includes(anchor.category)) return "indian";
  return "western";
}

function planSlots(anchor: Garment, dir: Direction, input: EngineInput, r: () => number): SlotSpec[] {
  const nudges = new Set(input.nudges ?? []);
  const lean = nudges.has("minimal") || (dir === "minimal" && !nudges.has("experimental"));
  const rich = dir === "bold" || nudges.has("experimental") || nudges.has("elegant");
  const cold = input.season === "winter" || input.season === "autumn";
  const wantsLayer = cold || r() < ({ minimal: 0.55, casual: 0.4, bold: 0.45, contemporary: 0.6 } as const)[dir];
  const jewelleryCount = lean ? 1 : rich ? 2 : dir === "contemporary" ? 2 : 1;
  const jewels: SlotSpec[] = Array.from({ length: jewelleryCount }, (_, i) => ({ slot: `jewellery-${i + 1}`, kind: "jewellery" as const }));
  const acc: SlotSpec[] = lean ? [] : [{ slot: "accessory", kind: "accessory", optional: true }];
  const cat = anchor.category;
  const role = roleOf(cat);

  // Indian garments ------------------------------------------------------
  if (cat === "saree") {
    return [
      { slot: "blouse", kind: "blouse" },
      { slot: "footwear", kind: "footwear" },
      { slot: "earrings", kind: "earrings" },
      ...(lean ? [] : [{ slot: "necklace", kind: "necklace" as const }]),
      ...(dir === "casual" || rich ? [{ slot: "bangles", kind: "bangles" as const }] : []),
      { slot: "bag", kind: "bag" },
    ];
  }
  if (cat === "lehenga") {
    return [
      { slot: "blouse", kind: "blouse" },
      { slot: "dupatta", kind: "dupatta" },
      { slot: "footwear", kind: "footwear" },
      { slot: "earrings", kind: "earrings" },
      ...(lean ? [] : [{ slot: "necklace", kind: "necklace" as const }]),
      ...(rich ? [{ slot: "bangles", kind: "bangles" as const }] : []),
      { slot: "bag", kind: "bag" },
    ];
  }
  if (cat === "saree-blouse") {
    return [{ slot: "drape", kind: "drape" }, { slot: "footwear", kind: "footwear" }, { slot: "earrings", kind: "earrings" }, { slot: "bag", kind: "bag" }];
  }
  if (cat === "salwar-suit" || cat === "indo-western") {
    return [
      ...(cat === "salwar-suit" && !lean ? [{ slot: "dupatta", kind: "dupatta" as const }] : []),
      { slot: "footwear", kind: "footwear" },
      { slot: "earrings", kind: "earrings" },
      ...(rich ? [{ slot: "bangles", kind: "bangles" as const }] : []),
      { slot: "bag", kind: "bag" },
    ];
  }
  if (cat === "kurta" || cat === "kurti") {
    return [
      { slot: "bottom", kind: "bottom" },
      ...(dir === "casual" || dir === "minimal" ? [{ slot: "dupatta", kind: "dupatta" as const, optional: true }] : []),
      ...(wantsLayer && dir !== "casual" ? [{ slot: "layer", kind: "layer" as const, optional: true }] : []),
      { slot: "footwear", kind: "footwear" },
      { slot: "earrings", kind: "earrings" },
      ...(rich ? [{ slot: "bangles", kind: "bangles" as const }] : []),
      { slot: "bag", kind: "bag" },
    ];
  }
  if (cat === "palazzo" || cat === "churidar") {
    return [{ slot: "top", kind: "top" }, { slot: "dupatta", kind: "dupatta", optional: true }, { slot: "footwear", kind: "footwear" }, { slot: "earrings", kind: "earrings" }, { slot: "bag", kind: "bag" }];
  }
  if (cat === "dupatta" || cat === "ethnic-jacket") {
    return [{ slot: "kurta", kind: "kurta" }, { slot: "bottom", kind: "bottom" }, { slot: "footwear", kind: "footwear" }, { slot: "earrings", kind: "earrings" }, { slot: "bag", kind: "bag" }];
  }

  // Western garments ------------------------------------------------------
  const layer: SlotSpec[] = wantsLayer ? [{ slot: "layer", kind: "layer", optional: true }] : [];
  switch (role) {
    case "top":
      return [{ slot: "bottom", kind: "bottom" }, ...layer, { slot: "footwear", kind: "footwear" }, ...jewels, { slot: "bag", kind: "bag" }, ...acc];
    case "bottom":
      return [{ slot: "top", kind: "top" }, ...layer, { slot: "footwear", kind: "footwear" }, ...jewels, { slot: "bag", kind: "bag" }, ...acc];
    case "layer":
      return [{ slot: "top", kind: "top" }, { slot: "bottom", kind: "bottom" }, { slot: "footwear", kind: "footwear" }, ...jewels, { slot: "bag", kind: "bag" }];
    case "onepiece":
      return [...layer, { slot: "footwear", kind: "footwear" }, ...jewels, { slot: "bag", kind: "bag" }, ...(lean ? [] : [{ slot: "accessory", kind: "accessory" as const, optional: true }])];
    default: {
      // footwear / jewellery / bag / accessory anchor — build the whole outfit around it
      const ctx = contextOf(anchor);
      const base: SlotSpec[] =
        ctx === "indian"
          ? dir === "minimal" || dir === "bold"
            ? [{ slot: "drape", kind: "drape" }, { slot: "blouse", kind: "blouse" }]
            : [{ slot: "kurta", kind: "kurta" }, { slot: "bottom", kind: "bottom" }]
          : r() < 0.35
            ? [{ slot: "onepiece", kind: "onepiece" }]
            : [{ slot: "top", kind: "top" }, { slot: "bottom", kind: "bottom" }];
      const rest: SlotSpec[] = [];
      if (role !== "footwear") rest.push({ slot: "footwear", kind: "footwear" });
      if (role !== "jewellery") rest.push(ctx === "indian" ? { slot: "earrings", kind: "earrings" } : { slot: "jewellery-1", kind: "jewellery" });
      if (role !== "bag") rest.push({ slot: "bag", kind: "bag" });
      return [...base, ...(ctx === "western" ? layer : []), ...rest];
    }
  }
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------
function targetFormality(anchor: Garment, dir: Direction, input: EngineInput) {
  let t = formalityOf(anchor);
  if (input.occasion && OCCASION_FORMALITY[input.occasion] != null) t = (t + 2 * OCCASION_FORMALITY[input.occasion]) / 3;
  t += { minimal: 0.3, casual: -1, bold: 0.2, contemporary: 0 }[dir];
  const n = new Set(input.nudges ?? []);
  if (n.has("formal")) t += 1.2;
  if (n.has("casual")) t -= 1.2;
  if (n.has("elegant")) t += 0.8;
  return Math.max(1, Math.min(5, t));
}

function scoreCand(c: Cand, dir: Direction, target: number, input: EngineInput, used: Set<string>, usedCats: Set<string>, r: () => number, anchor: Garment) {
  const it = c.item;
  const d = DIR_INDEX[dir];
  const n = new Set(input.nudges ?? []);
  let s = it.dir[d] * 2.2 - Math.abs(it.formal - target) * 1.15;
  if (n.has("experimental")) s += (it.dir[2] + it.dir[3]) * 0.6 - it.dir[0] * 0.3;
  if (n.has("minimal")) s += it.dir[0] * 0.8 - it.dir[2] * 0.4;
  if (n.has("elegant")) s += it.formal >= 3 ? 1 : -1.2;
  if (n.has("affordable")) s += (2 - it.price) * 1.2 + (c.owned ? 2.5 : 0);
  if (n.has("colourful") && it.color === "accent") s += 1.2;
  const budget = input.profile?.budget;
  if (budget === "accessible") s += it.price === 1 ? 0.8 : it.price === 3 ? -0.9 : 0;
  if (budget === "investment") s += it.price === 3 ? 0.6 : 0;
  if (input.season && it.seasons && !it.seasons.includes(input.season)) s -= 3;
  s += (input.profile?.affinity?.[c.key] ?? 0) * 0.8;
  if ((input.profile?.recent ?? []).includes(c.key)) s -= 0.8;
  if (used.has(c.key)) s -= 5;
  if (usedCats.has(it.cat)) s -= 2.5;
  if (c.owned) {
    s += input.mode === "wardrobe" ? 0 : 1.5;
    // owned items carry their own colour — reward harmony with the anchor
    const col = c.owned.color;
    const harmonious = isNeutral(col) || complements(anchor.color).includes(col) || analogous(anchor.color).includes(col) || partnerNeutrals(anchor.color).includes(col);
    s += harmonious ? 1 : -2;
    if (col === anchor.color && !isNeutral(col)) s -= 1.5;
  }
  // proportion: balance volume
  const anchorVolume = /oversized|relaxed|boxy|wide|flared/.test(`${anchor.fit} ${anchor.silhouette}`);
  const itemVolume = /oversized|relaxed|boxy|wide|flared/.test(`${it.fit} ${it.silhouette}`);
  if (anchorVolume && itemVolume && ["top", "bottom"].includes(roleOf(it.cat))) s -= 1.4;
  if (anchorVolume && /fitted|slim|tailored|straight/.test(`${it.fit}`)) s += 0.8;
  // prefer user's preferred fits
  const fits = input.profile?.fits ?? [];
  if (it.fit && fits.includes(it.fit)) s += 0.7;
  s += r() * 2;
  return s;
}

function choose(pool: Cand[], dir: Direction, target: number, input: EngineInput, used: Set<string>, usedCats: Set<string>, r: () => number, anchor: Garment) {
  let best: Cand | undefined;
  let bs = -Infinity;
  for (const c of pool) {
    const s = scoreCand(c, dir, target, input, used, usedCats, r, anchor);
    if (s > bs) { bs = s; best = c; }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Explanations & annotations
// ---------------------------------------------------------------------------
const TITLES: Record<Direction, { western: string[]; indian: string[] }> = {
  minimal: { western: ["The Quiet Line", "Clean Architecture", "Tonal Study", "Less, Better"], indian: ["Heirloom, Pared Back", "The Quiet Drape", "Modern Classic"] },
  casual: { western: ["Off-Duty Ease", "The Sunday Edit", "Easy Uniform", "Weekend Rhythm"], indian: ["Everyday Ethnic", "Soft Cotton Days", "Easy Festive"] },
  bold: { western: ["Colour Theory", "The Statement", "High Contrast", "Turn It Up"], indian: ["Maximalist Heirloom", "Festive Voltage", "Jewel Box"] },
  contemporary: { western: ["New Proportions", "The Modern Edit", "Off-Kilter Classic", "Now, Not Next"], indian: ["Indo-Modern", "New Tradition", "The Remix"] },
};

function pieceName(p: Piece) {
  return p.garment.name.toLowerCase();
}

function explain(anchor: Garment, pieces: Piece[], pal: Palette, dir: Direction, ctx: "western" | "indian"): string[] {
  const why: string[] = [];
  const A = anchor.color;
  const others = pieces.filter((p) => !p.anchor);
  const clothing = others.filter((p) => ["top", "bottom", "layer", "onepiece", "drape", "dupatta"].includes(p.role) || p.garment.category === "saree-blouse");
  const firstCloth = clothing[0];
  const accentPiece = others.find((p) => p.garment.color === pal.accent && !p.anchor);
  const anchorLabel = `${A} ${categoryLabel(anchor.category).toLowerCase()}`;

  // colour
  if (dir === "minimal") {
    why.push(`Colour: ${cap(A)} with ${firstCloth ? firstCloth.garment.color : pal.base[0]} keeps the palette restrained — when colour steps back, cut and fabric do the talking.`);
  } else if (dir === "casual") {
    const present = Array.from(new Set(others.map((p) => p.garment.color).filter((c) => c !== A && !["gold", "silver", "pearl"].includes(c)))).slice(0, 2);
    why.push(`Colour: ${cap(A)} against ${present.length ? present.join(" and ") : pal.base[0]} reads relaxed and familiar — easy colour that never needs thinking about.`);
  } else if (dir === "bold") {
    const isComp = complements(A).includes(pal.accent);
    why.push(`Colour: ${cap(A)} and ${pal.accent} are ${isComp ? "complementary — opposites that make each other look more saturated" : "a deliberate high-contrast pairing"}. Colour-blocking works best when each colour gets a whole piece.`);
  } else if (pal.base[0] === pal.accent) {
    why.push(`Colour: ${cap(A)} with ${pal.accent} — one confident colour story, repeated just enough to look intentional.`);
  } else {
    why.push(`Colour: tonal ${pal.base[0]} sits close to ${A}${accentPiece ? `, with a single hit of ${pal.accent} in the ${categoryLabel(accentPiece.garment.category).toLowerCase()}` : ""} — modern colour looks considered, not matched.`);
  }

  // proportion / silhouette
  const vol = (g: Garment) => /oversized|relaxed|boxy|wide|flared|maxi/.test(`${g.fit} ${g.silhouette} ${g.length}`);
  const slim = (g: Garment) => /fitted|slim|tailored|straight|bodycon|tapered/.test(`${g.fit} ${g.silhouette}`);
  if (anchor.category === "saree") {
    const b = others.find((p) => p.garment.category === "saree-blouse");
    if (b) why.push(`Proportion: the ${pieceName(b)} frames the shoulders so the length of the drape stays the focus.`);
  } else if (anchor.category === "lehenga") {
    why.push(`Proportion: a fitted choli balances the volume of the skirt; the dupatta adds a vertical line that lengthens the frame.`);
  } else if (vol(anchor)) {
    const s = others.find((p) => slim(p.garment) && ["top", "bottom"].includes(p.role));
    why.push(`Proportion: the ${anchor.fit ?? anchor.silhouette ?? "relaxed"} ${categoryLabel(anchor.category).toLowerCase()} is balanced by ${s ? `the ${pieceName(s)}` : "a cleaner line elsewhere"} — volume on one half, line on the other.`);
  } else if (["skirt", "trousers", "palazzo"].includes(anchor.category) && /midi|maxi|wide|full/.test(`${anchor.length} ${anchor.silhouette}`)) {
    why.push(`Proportion: with a ${anchor.length ?? anchor.silhouette} ${categoryLabel(anchor.category).toLowerCase()}, a tucked or cropped top defines the waist and keeps the leg line long.`);
  } else if (firstCloth) {
    why.push(`Proportion: ${vol(firstCloth.garment) ? `the ${pieceName(firstCloth)} adds ease against the ${anchorLabel}` : `the ${pieceName(firstCloth)} keeps a clean line, letting the ${anchorLabel} lead`}.`);
  }

  // texture
  const fabrics = Array.from(new Set(pieces.map((p) => p.garment.fabric).filter(Boolean))) as string[];
  if (fabrics.length >= 2) {
    const [a, b] = fabrics;
    why.push(`Texture: ${a} against ${b} — ${textureContrast(a, b)}.`);
  }

  // finishing
  const shoes = others.find((p) => p.role === "footwear");
  const metalPiece = others.find((p) => ["gold", "silver", "pearl"].includes(p.garment.color));
  if (metalPiece) {
    why.push(`Finish: ${metalPiece.garment.color} ${metalPiece.garment.color === "gold" ? "picks up warmth" : metalPiece.garment.color === "pearl" ? "softens the palette" : "keeps the palette cool and crisp"}${shoes ? `, and ${pieceName(shoes)} set the tone ${shoes.garment.category === "sneakers" || shoes.garment.category === "kolhapuris" ? "down, for ease" : "up, for polish"}` : ""}.`);
  } else if (shoes) {
    why.push(`Finish: ${pieceName(shoes)} ${shoes.garment.category === "sneakers" ? "keep it grounded and wearable" : "sharpen the whole look"}.`);
  }
  if (ctx === "indian" && anchor.detail && /gold/.test(anchor.detail)) {
    why.push(`Detail: the gold in the ${anchorLabel} is echoed in the jewellery, so nothing competes with it.`);
  }
  return why;
}

function textureContrast(a: string, b: string) {
  const sheen = ["silk", "satin", "organza", "chiffon", "banarasi silk", "kanjeevaram silk", "velvet"];
  const matte = ["cotton", "linen", "wool", "denim", "knit", "tweed", "khadi", "crepe", "cashmere"];
  if ((sheen.includes(a) && matte.includes(b)) || (sheen.includes(b) && matte.includes(a))) return "sheen meets matte, so the look has depth even in one colour";
  if (a === "leather" || b === "leather") return "leather brings edge and structure to softer fabric";
  if (a === "denim" || b === "denim") return "denim keeps it grounded and real";
  return "two textures give the eye somewhere to rest";
}

/** Designer-note annotations. Shared by the engine and the interactive panel. */
export function annotate(pieces: Piece[], pal: Palette | undefined, dir: Direction | undefined): Annotation[] {
  const notes: Annotation[] = [];
  const add = (slot: string, text: string) => {
    if (notes.length < 3 && !notes.some((n) => n.slot === slot || n.text === text)) notes.push({ slot, text });
  };
  const anchor = pieces.find((p) => p.anchor);
  const top = pieces.find((p) => p.slot === "top" || (p.anchor && p.role === "top"));
  const bottom = pieces.find((p) => p.role === "bottom");
  const layer = pieces.find((p) => p.role === "layer");
  if (layer && /oversized|boxy/.test(`${layer.garment.fit}`)) add(layer.slot, "Balance the oversized silhouette.");
  if (top && bottom && top.garment.category === "shirt") add(top.slot, "A tucked-in shirt changes the entire look.");
  if (anchor && anchor.garment.category === "saree") add(anchor.slot, dir === "contemporary" ? "Belt the pallu for a modern line." : "Pin the pleats crisp — it's all in the fall.");
  if (anchor && anchor.garment.category === "lehenga") add(anchor.slot, "Let the dupatta fall from one shoulder.");
  const gold = pieces.find((p) => !p.anchor && p.garment.color === "gold" && ["jewellery", "accessory"].includes(p.role));
  if (gold) add(gold.slot, "Add a gold accent.");
  if (pal && dir === "bold") {
    const accent = pieces.find((p) => !p.anchor && p.garment.color === pal.accent && ["top", "bottom", "layer", "bag"].includes(p.role));
    if (accent) add(accent.slot, "Try a little contrast here.");
  }
  for (const p of pieces) {
    const t = CATALOG.find((i) => i.key === p.key)?.note;
    if (t) add(p.slot, t);
  }
  if (anchor && notes.length < 2) {
    const lead: Record<Direction, string> = {
      minimal: "Let this piece lead — keep the rest quiet.",
      casual: "Wear it like you didn't think about it.",
      bold: "Turn the volume up around it.",
      contemporary: "Style it slightly off-script.",
    };
    add(anchor.slot, lead[dir ?? "minimal"]);
  }
  return notes;
}

function occasionsFor(avgFormality: number, ctx: "western" | "indian", requested?: string) {
  const w = [
    [1.8, ["Weekend", "College", "Errands"]],
    [2.6, ["Brunch", "Travel", "Casual Friday"]],
    [3.4, ["Work", "Dinner", "Gallery opening"]],
    [4.2, ["Date night", "Cocktails", "Presentations"]],
    [9, ["Wedding guest", "Gala", "Black tie"]],
  ] as const;
  const i = [
    [2.4, ["Day out", "College", "Casual pooja"]],
    [3.4, ["Office ethnic day", "Festive lunch", "Mehendi"]],
    [4.3, ["Sangeet", "Diwali evening", "Reception"]],
    [9, ["Wedding", "Bridal party", "Grand celebration"]],
  ] as const;
  const table = ctx === "indian" ? i : w;
  const found = (table.find(([lim]) => avgFormality <= lim) ?? table[table.length - 1])[1];
  const list: string[] = [...found];
  if (requested && !list.some((x) => x.toLowerCase().includes(requested))) list.unshift(cap(requested));
  return list.slice(0, 3);
}

const DRAPE_NOTES: Record<Direction, { drape: string; hair: string }> = {
  minimal: { drape: "Classic Nivi drape — neat pleats, pallu pinned at the shoulder.", hair: "Low, sleek bun with a centre parting." },
  casual: { drape: "Open pallu, loosely draped over the arm.", hair: "Soft side braid or loose waves." },
  bold: { drape: "Butterfly drape with a slim pleated pallu to show the blouse.", hair: "Voluminous blow-out, or a bun wrapped in a gajra." },
  contemporary: { drape: "Belted or pant-style drape — pallu tucked under a slim belt.", hair: "Sleek low ponytail, tucked behind the ears." },
};

export const DRAPE_OPTIONS = [
  "Classic Nivi drape — neat pleats, pallu pinned at the shoulder.",
  "Open pallu, loosely draped over the arm.",
  "Butterfly drape with a slim pleated pallu to show the blouse.",
  "Belted or pant-style drape — pallu tucked under a slim belt.",
  "Bengali drape with a key-bunch at the pallu.",
  "Gujarati seedha pallu, falling to the front.",
];
export const HAIR_OPTIONS = [
  "Low, sleek bun with a centre parting.",
  "Soft side braid or loose waves.",
  "Voluminous blow-out.",
  "Bun wrapped in a gajra.",
  "Sleek low ponytail, tucked behind the ears.",
  "Half-up with a jewelled pin.",
];

function lookNotes(anchor: Garment, dir: Direction): string[] | undefined {
  if (anchor.category === "saree") return [`Drape: ${DRAPE_NOTES[dir].drape}`, `Hair: ${DRAPE_NOTES[dir].hair}`];
  if (anchor.category === "lehenga") return [`Dupatta: ${dir === "minimal" ? "pleated and pinned on one shoulder" : dir === "bold" ? "draped across both arms, cape-style" : "worn as a cape, or skipped entirely"}.`, `Hair: ${DRAPE_NOTES[dir].hair}`];
  if (["kurta", "kurti", "salwar-suit"].includes(anchor.category)) return [`Hair: ${DRAPE_NOTES[dir].hair}`];
  return undefined;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
function anchorPiece(input: EngineInput): Piece {
  return { role: roleOf(input.anchor.category), slot: "anchor", garment: input.anchor, key: "anchor", owned: input.anchorOwned ?? true, anchor: true };
}

function finishLook(input: EngineInput, dir: Direction, pieces: Piece[], pal: Palette, target: number, ctx: "western" | "indian", seed: number, extraNotes: string[], r: () => number): Look {
  const palette = Array.from(new Set(pieces.map((p) => p.garment.color))).map((name) => ({ name, hex: hexOf(name) }));
  const forms = pieces.map((p) => formalityOf(p.garment));
  const avg = forms.reduce((a, b) => a + b, 0) / forms.length;
  const titles = TITLES[dir][ctx];
  const notes = [...(lookNotes(input.anchor, dir) ?? []), ...extraNotes];
  return {
    id: uid("look_"),
    direction: dir,
    title: titles[Math.floor(r() * titles.length)],
    pieces,
    palette,
    why: explain(input.anchor, pieces, pal, dir, ctx),
    occasions: occasionsFor(avg, ctx, input.occasion),
    annotations: annotate(pieces, pal, dir),
    notes: notes.length ? notes : undefined,
    engine: "rules",
    meta: { pal, target, ctx, seed },
  };
}

export function buildLook(input: EngineInput, dir: Direction, used: Set<string>, seed: number): Look {
  const r = rng(seed);
  const ctx = contextOf(input.anchor);
  const pal = buildPalette(input.anchor, dir, input, r);
  const target = targetFormality(input.anchor, dir, input);
  const slots = planSlots(input.anchor, dir, input, r);
  const pieces: Piece[] = [anchorPiece(input)];
  const usedCats = new Set<string>([input.anchor.category]);
  const missing: string[] = [];
  let baseIdx = 0;
  for (const s of slots) {
    const pool = poolFor(s.kind, ctx, input).filter((c) => !pieces.some((p) => p.key === c.key));
    const c = choose(pool, dir, target, input, used, usedCats, r, input.anchor);
    if (!c) {
      if (!s.optional) missing.push(SLOT_LABEL[s.kind].toLowerCase());
      continue;
    }
    used.add(c.key);
    usedCats.add(c.item.cat);
    const isCloth = ["top", "bottom", "layer", "onepiece", "blouse", "drape", "dupatta", "kurta"].includes(s.kind);
    const colorName = c.owned ? c.owned.color : colorFor(c.item.color, pal, isCloth ? baseIdx++ : 1, input.anchor.color);
    pieces.push({ role: roleOf(c.item.cat) as Role, slot: s.slot, garment: toGarment(c, colorName), key: c.key, owned: !!c.owned });
  }
  const extra = missing.length ? [`Your wardrobe has no ${missing.join(" or ")} that work here yet — switch to Explore to see suggestions.`] : [];
  return finishLook(input, dir, pieces, pal, target, ctx, seed, extra, r);
}

export function generateLooks(input: EngineInput): Look[] {
  const seed = input.seed ?? hashStr(input.anchor.name + Date.now());
  const used = new Set<string>();
  return (input.directions ?? DIRECTIONS).map((d, i) => buildLook(input, d, used, seed + i * 7919));
}

/** Swap one component of a look for a fresh alternative; everything else stays. */
export function regeneratePiece(look: Look, slot: string, input: EngineInput, seed = Date.now()): Look {
  const meta = look.meta;
  const idx = look.pieces.findIndex((p) => p.slot === slot);
  if (idx < 0 || !meta || look.pieces[idx].anchor) return look;
  const r = rng(seed);
  const kind = kindOfSlot(slot === "jewellery" ? "jewellery" : slot);
  const current = look.pieces[idx];
  const pool = poolFor(kind, meta.ctx, input).filter((c) => !look.pieces.some((p) => p.key === c.key));
  const used = new Set<string>([current.key]);
  const usedCats = new Set(look.pieces.filter((p, i) => i !== idx).map((p) => p.garment.category));
  const c = choose(pool, look.direction, meta.target, input, used, usedCats, r, input.anchor);
  if (!c) return look;
  const isCloth = ["top", "bottom", "layer", "onepiece", "blouse", "drape", "dupatta", "kurta"].includes(kind);
  const colorName = c.owned ? c.owned.color : colorFor(c.item.color, meta.pal, isCloth ? 0 : 1, input.anchor.color);
  return replacePiece(look, idx, { role: roleOf(c.item.cat), slot, garment: toGarment(c, colorName), key: c.key, owned: !!c.owned }, input);
}

function replacePiece(look: Look, idx: number, piece: Piece, input: EngineInput): Look {
  const pieces = look.pieces.slice();
  if (idx >= 0) pieces[idx] = piece;
  else pieces.push(piece);
  return refresh({ ...look, pieces }, input);
}

function refresh(look: Look, input: EngineInput): Look {
  const meta = look.meta!;
  const palette = Array.from(new Set(look.pieces.map((p) => p.garment.color))).map((name) => ({ name, hex: hexOf(name) }));
  return {
    ...look,
    palette,
    why: explain(input.anchor, look.pieces, meta.pal, look.direction, meta.ctx),
    annotations: annotate(look.pieces, meta.pal, look.direction),
  };
}

// ---------------------------------------------------------------------------
// Interactive panel ("Style your black blazer")
// ---------------------------------------------------------------------------
export interface PanelOption {
  id: string;
  label: string;
  sub?: string;
  swatch?: string;
  owned?: boolean;
}
export interface PanelGroup {
  id: string;
  label: string;
  kind: "piece" | "color" | "note";
  slot?: string;
  options: PanelOption[];
}

function panelKinds(anchor: Garment): { kind: SlotKind; slot: string }[] {
  const c = anchor.category;
  if (c === "saree") return [{ kind: "blouse", slot: "blouse" }, { kind: "earrings", slot: "earrings" }, { kind: "necklace", slot: "necklace" }, { kind: "bangles", slot: "bangles" }, { kind: "bag", slot: "bag" }, { kind: "footwear", slot: "footwear" }];
  if (c === "lehenga") return [{ kind: "blouse", slot: "blouse" }, { kind: "dupatta", slot: "dupatta" }, { kind: "earrings", slot: "earrings" }, { kind: "necklace", slot: "necklace" }, { kind: "bangles", slot: "bangles" }, { kind: "footwear", slot: "footwear" }, { kind: "bag", slot: "bag" }];
  if (c === "saree-blouse") return [{ kind: "drape", slot: "drape" }, { kind: "earrings", slot: "earrings" }, { kind: "footwear", slot: "footwear" }, { kind: "bag", slot: "bag" }];
  if (c === "kurta" || c === "kurti") return [{ kind: "bottom", slot: "bottom" }, { kind: "dupatta", slot: "dupatta" }, { kind: "layer", slot: "layer" }, { kind: "footwear", slot: "footwear" }, { kind: "earrings", slot: "earrings" }, { kind: "bag", slot: "bag" }];
  if (c === "salwar-suit" || c === "indo-western") return [{ kind: "dupatta", slot: "dupatta" }, { kind: "footwear", slot: "footwear" }, { kind: "earrings", slot: "earrings" }, { kind: "bangles", slot: "bangles" }, { kind: "bag", slot: "bag" }];
  if (c === "palazzo" || c === "churidar") return [{ kind: "top", slot: "top" }, { kind: "dupatta", slot: "dupatta" }, { kind: "footwear", slot: "footwear" }, { kind: "earrings", slot: "earrings" }, { kind: "bag", slot: "bag" }];
  if (c === "dupatta" || c === "ethnic-jacket") return [{ kind: "kurta", slot: "kurta" }, { kind: "bottom", slot: "bottom" }, { kind: "footwear", slot: "footwear" }, { kind: "earrings", slot: "earrings" }];
  const role = roleOf(c);
  const out: { kind: SlotKind; slot: string }[] = [];
  if (role !== "top" && role !== "onepiece") out.push({ kind: "top", slot: "top" });
  if (role !== "bottom" && role !== "onepiece") out.push({ kind: "bottom", slot: "bottom" });
  if (role !== "layer") out.push({ kind: "layer", slot: "layer" });
  out.push({ kind: "jewellery", slot: "jewellery-1" }, { kind: "bag", slot: "bag" }, { kind: "accessory", slot: "accessory" });
  if (role !== "footwear") out.push({ kind: "footwear", slot: "footwear" });
  return out;
}

/** Start a live composition for the panel. */
export function startComposition(input: EngineInput): Look {
  const seed = input.seed ?? hashStr(input.anchor.name);
  const look = buildLook(input, "contemporary", new Set(), seed);
  return look;
}

export function panelGroups(look: Look, input: EngineInput): PanelGroup[] {
  const meta = look.meta!;
  const groups: PanelGroup[] = [];
  const target = meta.target;
  for (const { kind, slot } of panelKinds(input.anchor)) {
    const pool = poolFor(kind, meta.ctx, input);
    const ranked = pool
      .map((c) => ({ c, s: (c.owned ? 3 : 0) + Math.max(...c.item.dir) + c.item.dir.reduce((a, b) => a + b, 0) * 0.25 - Math.abs(c.item.formal - target) * 0.6 }))
      .sort((a, b) => b.s - a.s)
      .slice(0, kind === "jewellery" ? 6 : 5);
    groups.push({
      id: slot,
      label: SLOT_LABEL[kind],
      kind: "piece",
      slot,
      options: ranked.map(({ c }) => {
        const colorName = c.owned ? c.owned.color : colorFor(c.item.color, meta.pal, 0, input.anchor.color);
        return { id: c.key, label: c.owned ? c.owned.name : cap(c.item.name), swatch: hexOf(colorName), owned: !!c.owned, sub: c.owned ? "In your wardrobe" : undefined };
      }),
    });
  }
  if (input.anchor.category === "saree") {
    groups.push({ id: "drape", label: "Draping", kind: "note", options: DRAPE_OPTIONS.map((d, i) => ({ id: "drape:" + i, label: d.split(" — ")[0].replace(/\.$/, ""), sub: d })) });
  }
  if (["saree", "lehenga", "kurta", "kurti", "salwar-suit"].includes(input.anchor.category)) {
    groups.push({ id: "hair", label: "Hair", kind: "note", options: HAIR_OPTIONS.map((d, i) => ({ id: "hair:" + i, label: d.replace(/\.$/, "") })) });
  }
  groups.push({
    id: "colour",
    label: "Colour pairings",
    kind: "color",
    options: pairings(input.anchor.color).map((c) => ({ id: c, label: `${cap(input.anchor.color)} & ${c}`, swatch: hexOf(c) })),
  });
  return groups;
}

export function applyPanelOption(look: Look, group: PanelGroup, optionId: string, input: EngineInput): Look {
  const meta = look.meta!;
  if (group.kind === "note") {
    const [type, i] = optionId.split(":");
    const text = type === "drape" ? `Drape: ${DRAPE_OPTIONS[+i]}` : `Hair: ${HAIR_OPTIONS[+i]}`;
    const prefix = type === "drape" ? "Drape:" : "Hair:";
    const notes = [...(look.notes ?? []).filter((n) => !n.startsWith(prefix)), text];
    return { ...look, notes };
  }
  if (group.kind === "color") {
    return recolor(look, optionId, input);
  }
  const slot = group.slot!;
  const kind = kindOfSlot(slot);
  const c = poolFor(kind, meta.ctx, input).find((x) => x.key === optionId);
  if (!c) return look;
  const idx = look.pieces.findIndex((p) => p.slot === slot);
  const isCloth = ["top", "bottom", "layer", "onepiece", "blouse", "drape", "dupatta", "kurta"].includes(kind);
  const colorName = c.owned ? c.owned.color : colorFor(c.item.color, meta.pal, isCloth ? 0 : 1, input.anchor.color);
  return replacePiece(look, idx, { role: roleOf(c.item.cat), slot, garment: toGarment(c, colorName), key: c.key, owned: !!c.owned }, input);
}

export function removePiece(look: Look, slot: string, input: EngineInput): Look {
  return refresh({ ...look, pieces: look.pieces.filter((p) => p.slot !== slot || p.anchor) }, input);
}

/** Re-colour every non-fixed suggested piece around a new partner colour. */
export function recolor(look: Look, partner: string, input: EngineInput): Look {
  const meta = look.meta!;
  const isMetal = partner === "gold" || partner === "silver";
  const pal: Palette = isMetal
    ? { ...meta.pal, metal: partner as "gold" | "silver" }
    : { ...meta.pal, base: [partner, meta.pal.base.find((b) => b !== partner) ?? "white"], accent: isNeutral(partner) ? meta.pal.accent : partner, shoe: isLight(partner) && isNeutral(partner) ? meta.pal.shoe : isNeutral(partner) ? partner : meta.pal.shoe };
  let baseIdx = 0;
  const pieces = look.pieces.map((p) => {
    if (p.anchor || p.owned) return p;
    const it = CATALOG.find((i) => i.key === p.key);
    if (!it || typeof it.color === "object") return p;
    const isCloth = ["top", "bottom", "layer", "onepiece", "drape", "dupatta"].includes(p.role) || p.garment.category === "saree-blouse";
    const colorName = colorFor(it.color, pal, isCloth ? baseIdx++ : 1, input.anchor.color);
    return { ...p, garment: { ...p.garment, color: colorName, colorHex: hexOf(colorName), name: labelFor(it, colorName) } };
  });
  return refresh({ ...look, pieces, meta: { ...meta, pal } }, input);
}

export function lookDescription(look: Look) {
  return look.pieces.map((p) => p.garment.name.toLowerCase()).join(", ");
}

export { CATEGORIES };
