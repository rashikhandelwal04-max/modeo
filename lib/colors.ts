// Colour library + colour-theory helpers used by the styling engine.

export interface NamedColor {
  name: string;
  hex: string;
  neutral?: boolean;
  metal?: boolean;
  aliases?: string[];
}

export const COLORS: NamedColor[] = [
  { name: "black", hex: "#141414", neutral: true, aliases: ["jet", "onyx", "noir"] },
  { name: "charcoal", hex: "#3a3a3c", neutral: true, aliases: ["graphite", "dark grey", "dark gray"] },
  { name: "grey", hex: "#8e8e90", neutral: true, aliases: ["gray", "heather", "slate"] },
  { name: "silver grey", hex: "#c4c4c6", neutral: true, aliases: ["light grey", "light gray", "dove"] },
  { name: "white", hex: "#f7f6f2", neutral: true, aliases: ["optic white", "snow"] },
  { name: "ivory", hex: "#efe8da", neutral: true, aliases: ["cream", "off-white", "off white", "ecru", "bone"] },
  { name: "beige", hex: "#d9c7a8", neutral: true, aliases: ["sand", "nude", "oatmeal", "stone"] },
  { name: "camel", hex: "#b38a5a", neutral: true, aliases: ["tan", "caramel", "cognac"] },
  { name: "taupe", hex: "#8b7d6b", neutral: true, aliases: ["mushroom", "greige"] },
  { name: "chocolate", hex: "#4a3226", neutral: true, aliases: ["brown", "espresso", "coffee", "mocha"] },
  { name: "navy", hex: "#1f2a44", neutral: true, aliases: ["midnight", "dark blue"] },
  { name: "denim blue", hex: "#4a6a8f", neutral: true, aliases: ["denim", "indigo", "chambray", "blue denim"] },
  { name: "light wash", hex: "#9fb6cc", neutral: true, aliases: ["light blue denim", "light wash denim"] },
  { name: "olive", hex: "#5d6340", neutral: true, aliases: ["khaki", "army green", "moss"] },
  { name: "gold", hex: "#c9a24a", metal: true, aliases: ["golden", "antique gold", "zari"] },
  { name: "silver", hex: "#b9bcc0", metal: true, aliases: ["metallic silver", "oxidised", "oxidized"] },
  { name: "pearl", hex: "#ece6dc", metal: true, aliases: ["pearls"] },
  { name: "burgundy", hex: "#6b1e2b", aliases: ["wine", "oxblood", "maroon", "bordeaux"] },
  { name: "red", hex: "#b3242c", aliases: ["scarlet", "crimson", "cherry", "lal"] },
  { name: "rust", hex: "#a14a26", aliases: ["terracotta", "burnt orange", "copper"] },
  { name: "orange", hex: "#d96b2b", aliases: ["tangerine"] },
  { name: "mustard", hex: "#c99a2e", aliases: ["ochre", "turmeric", "haldi"] },
  { name: "yellow", hex: "#e6c84a", aliases: ["lemon", "butter", "canary", "sunflower"] },
  { name: "sage", hex: "#9aab8e", aliases: ["mint green", "pistachio", "eucalyptus"] },
  { name: "green", hex: "#2f6b45", aliases: ["emerald", "bottle green", "forest", "jade"] },
  { name: "teal", hex: "#1f6a6b", aliases: ["peacock", "turquoise"] },
  { name: "sky blue", hex: "#8fb3d9", aliases: ["powder blue", "baby blue", "light blue"] },
  { name: "cobalt", hex: "#2346a0", aliases: ["royal blue", "electric blue", "blue"] },
  { name: "lavender", hex: "#b7a6cf", aliases: ["lilac", "mauve", "wisteria"] },
  { name: "plum", hex: "#5b2a4f", aliases: ["aubergine", "purple", "violet", "magenta"] },
  { name: "blush", hex: "#e3b8b0", aliases: ["blush pink", "dusty pink", "rose", "baby pink", "pink"] },
  { name: "fuchsia", hex: "#c2357a", aliases: ["hot pink", "rani pink", "rani", "magenta pink"] },
];

const BY_NAME = new Map(COLORS.map((c) => [c.name, c]));

export function color(name: string): NamedColor {
  return BY_NAME.get(name) ?? { name, hex: "#888888" };
}

export function hexOf(name: string) {
  return color(name).hex;
}

/** Find a colour mentioned in free text (longest match wins). */
export function findColorInText(text: string): string | undefined {
  const t = ` ${text.toLowerCase()} `;
  let best: { name: string; len: number; idx: number } | undefined;
  for (const c of COLORS) {
    for (const w of [c.name, ...(c.aliases ?? [])]) {
      const re = new RegExp(`[^a-z]${w.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}[^a-z]`);
      const m = re.exec(t);
      if (m && (!best || w.length > best.len)) best = { name: c.name, len: w.length, idx: m.index };
    }
  }
  return best?.name;
}

// --- HSL helpers -----------------------------------------------------------
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
}
export function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((x) => x / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

/** Perceptual-ish distance in RGB (weighted). */
function dist(a: string, b: string) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const rm = (r1 + r2) / 2;
  return Math.sqrt((2 + rm / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - rm) / 256) * (b1 - b2) ** 2);
}

/** Map any hex (e.g. extracted from a photo) to the closest named colour. */
export function nearestColor(hex: string): NamedColor {
  let best = COLORS[0];
  let bd = Infinity;
  for (const c of COLORS) {
    if (c.name === "pearl") continue;
    const d = dist(hex, c.hex);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

export function isNeutral(name: string) {
  return !!color(name).neutral;
}
export function isLight(name: string) {
  return hexToHsl(hexOf(name))[2] > 0.62;
}
export function isDark(name: string) {
  return hexToHsl(hexOf(name))[2] < 0.3;
}

const CHROMATIC = COLORS.filter((c) => !c.neutral && !c.metal);

function hueOf(name: string) {
  return hexToHsl(hexOf(name))[0];
}
function hueDelta(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Chromatic colours sorted by how close their hue is to `target` degrees. */
function byHue(target: number, exclude: string[] = []) {
  return CHROMATIC.filter((c) => !exclude.includes(c.name))
    .map((c) => ({ c, d: hueDelta(hueOf(c.name), target) }))
    .sort((x, y) => x.d - y.d)
    .map((x) => x.c.name);
}

/** Curated complementary pairs — fashion does not follow the wheel blindly. */
const CURATED_COMPLEMENTS: Record<string, string[]> = {
  yellow: ["cobalt", "lavender", "navy"],
  mustard: ["plum", "navy", "teal"],
  red: ["blush", "navy", "green"],
  burgundy: ["blush", "camel", "sage"],
  rust: ["teal", "navy", "sage"],
  orange: ["cobalt", "fuchsia", "navy"],
  sage: ["blush", "rust", "lavender"],
  green: ["fuchsia", "blush", "gold"],
  teal: ["rust", "fuchsia", "mustard"],
  "sky blue": ["rust", "chocolate", "yellow"],
  cobalt: ["yellow", "orange", "blush"],
  lavender: ["yellow", "sage", "chocolate"],
  plum: ["mustard", "sage", "blush"],
  blush: ["burgundy", "sage", "red"],
  fuchsia: ["orange", "green", "teal"],
  gold: ["burgundy", "green", "teal"],
};

export function complements(name: string): string[] {
  if (CURATED_COMPLEMENTS[name]) return CURATED_COMPLEMENTS[name];
  if (isNeutral(name)) {
    // neutrals: the "complement" is a confident accent that flatters the neutral
    const map: Record<string, string[]> = {
      black: ["red", "cobalt", "fuchsia"],
      charcoal: ["burgundy", "cobalt", "lavender"],
      grey: ["burgundy", "yellow", "cobalt"],
      "silver grey": ["burgundy", "plum", "cobalt"],
      white: ["cobalt", "red", "green"],
      ivory: ["burgundy", "green", "rust"],
      beige: ["chocolate", "cobalt", "burgundy"],
      camel: ["navy", "burgundy", "teal"],
      taupe: ["blush", "plum", "teal"],
      chocolate: ["sky blue", "lavender", "blush"],
      navy: ["rust", "yellow", "red"],
      "denim blue": ["rust", "red", "yellow"],
      "light wash": ["rust", "burgundy", "yellow"],
      olive: ["rust", "fuchsia", "blush"],
    };
    return map[name] ?? ["burgundy"];
  }
  return byHue((hueOf(name) + 180) % 360, [name]).slice(0, 3);
}

export function analogous(name: string): string[] {
  if (isNeutral(name)) {
    const map: Record<string, string[]> = {
      black: ["charcoal", "grey"], charcoal: ["black", "grey"], grey: ["charcoal", "silver grey"],
      "silver grey": ["grey", "white"], white: ["ivory", "silver grey"], ivory: ["beige", "white"],
      beige: ["camel", "ivory"], camel: ["chocolate", "beige"], taupe: ["beige", "chocolate"],
      chocolate: ["camel", "taupe"], navy: ["denim blue", "charcoal"], "denim blue": ["navy", "light wash"],
      "light wash": ["sky blue", "denim blue"], olive: ["camel", "chocolate"],
    };
    return map[name] ?? ["grey"];
  }
  const h = hueOf(name);
  return byHue(h, [name]).filter((n) => hueDelta(hueOf(n), h) < 70).slice(0, 3);
}

/** Neutrals that pair beautifully with a given colour, most refined first. */
export function partnerNeutrals(name: string): string[] {
  const map: Record<string, string[]> = {
    black: ["white", "ivory", "charcoal", "camel"],
    charcoal: ["white", "silver grey", "black", "ivory"],
    grey: ["white", "charcoal", "navy", "black"],
    "silver grey": ["charcoal", "white", "navy"],
    white: ["navy", "black", "beige", "denim blue"],
    ivory: ["camel", "chocolate", "black", "beige"],
    beige: ["ivory", "chocolate", "white", "navy"],
    camel: ["ivory", "black", "navy", "chocolate"],
    taupe: ["ivory", "white", "chocolate"],
    chocolate: ["ivory", "beige", "camel"],
    navy: ["white", "ivory", "camel", "grey"],
    "denim blue": ["white", "ivory", "beige", "black"],
    "light wash": ["white", "beige", "navy"],
    olive: ["ivory", "camel", "black", "white"],
    yellow: ["white", "ivory", "grey", "denim blue"],
    mustard: ["chocolate", "ivory", "denim blue", "black"],
    red: ["black", "white", "denim blue", "navy"],
    burgundy: ["black", "camel", "grey", "ivory"],
    rust: ["ivory", "denim blue", "chocolate", "beige"],
    orange: ["white", "navy", "denim blue"],
    sage: ["ivory", "white", "camel", "denim blue"],
    green: ["ivory", "black", "white", "camel"],
    teal: ["ivory", "camel", "white", "black"],
    "sky blue": ["white", "ivory", "navy", "beige"],
    cobalt: ["white", "black", "ivory"],
    lavender: ["white", "grey", "ivory", "silver grey"],
    plum: ["grey", "black", "ivory", "camel"],
    blush: ["ivory", "grey", "camel", "white"],
    fuchsia: ["white", "black", "ivory"],
    gold: ["ivory", "black", "white"],
    silver: ["charcoal", "white", "black"],
  };
  return map[name] ?? ["white", "black"];
}

/** Which metal flatters a colour — warm palettes take gold, cool take silver. */
export function metalFor(name: string, prefer?: "gold" | "silver"): "gold" | "silver" {
  if (prefer) return prefer;
  const warm = ["camel", "beige", "ivory", "chocolate", "olive", "yellow", "mustard", "rust", "orange", "red", "burgundy", "green", "teal", "gold", "black", "fuchsia", "blush"];
  return warm.includes(name) ? "gold" : "silver";
}

/** Colour pairings for the interactive panel: "Black and white", etc. */
export function pairings(name: string): string[] {
  const out = [...partnerNeutrals(name).slice(0, 3), ...complements(name).slice(0, 1), metalFor(name)];
  if (name === "black") return ["white", "beige", "grey", "burgundy", "gold"];
  return Array.from(new Set(out.filter((n) => n !== name))).slice(0, 5);
}

export function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
