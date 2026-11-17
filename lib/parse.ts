import { ATTRIBUTE_OPTIONS, CATEGORIES, categoryLabel } from "./taxonomy";
import { findColorInText, hexOf } from "./colors";
import type { Category, Garment, GarmentAttributes } from "./types";
import { uid } from "./util";

function findOption(text: string, options: readonly string[]) {
  const t = text.toLowerCase();
  let best: string | undefined;
  for (const o of options) {
    const re = new RegExp(`(^|[^a-z])${o.toLowerCase().replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}([^a-z]|$)`);
    if (re.test(t) && (!best || o.length > best.length)) best = o;
  }
  return best;
}

export function findCategory(text: string): Category | undefined {
  const t = ` ${text.toLowerCase()} `;
  let best: { c: Category; len: number } | undefined;
  for (const [c, info] of Object.entries(CATEGORIES) as [Category, (typeof CATEGORIES)[Category]][]) {
    for (const w of info.words) {
      const re = new RegExp(`[^a-z]${w.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}[^a-z]`);
      if (re.test(t) && (!best || w.length > best.len)) best = { c, len: w.length };
    }
  }
  return best?.c;
}

/** Parse a free-text garment description such as "black saree with gold detailing". */
export function parseGarmentText(text: string): Partial<GarmentAttributes> {
  const out: Partial<GarmentAttributes> = {};
  const lower = text.toLowerCase();
  const category = findCategory(lower);
  if (category) out.category = category;
  // colour: look at the part before "with" first, so "black saree with gold border" -> black
  const main = lower.split(/\bwith\b/)[0];
  const color = findColorInText(main) ?? findColorInText(lower);
  if (color) out.color = color;
  // "blue jeans" means denim, not cobalt
  if ((category === "jeans" || /denim/.test(lower)) && (!color || color === "cobalt")) out.color = /light/.test(lower) ? "light wash" : "denim blue";
  const fit = findOption(lower.replace("straight-fit", "straight fit"), ATTRIBUTE_OPTIONS.fit);
  if (fit) out.fit = fit;
  const fabric = findOption(lower, ATTRIBUTE_OPTIONS.fabric);
  if (fabric) out.fabric = fabric;
  const length = findOption(lower, ATTRIBUTE_OPTIONS.length);
  if (length) out.length = length;
  const sil = findOption(lower, ATTRIBUTE_OPTIONS.silhouette);
  if (sil) out.silhouette = sil;
  const pattern = findOption(lower, ATTRIBUTE_OPTIONS.pattern);
  if (pattern) out.pattern = pattern;
  const withPart = lower.split(/\bwith\b/)[1];
  if (withPart) out.detail = withPart.trim();
  if (/gold (detail|border|zari|work|embroidery)/.test(lower) || /zari/.test(lower)) out.detail = out.detail ?? "gold detailing";
  return out;
}

export function garmentName(a: Partial<GarmentAttributes>) {
  const parts = [a.color, a.fit && a.fit !== "regular" ? a.fit : undefined, a.length, a.fabric, a.category ? categoryLabel(a.category).toLowerCase() : "garment"];
  let n = parts.filter(Boolean).join(" ");
  if (a.detail) n += ` with ${a.detail}`;
  return n.charAt(0).toUpperCase() + n.slice(1);
}

export function makeGarment(a: Partial<GarmentAttributes> & { name?: string; imageId?: string; imageUrl?: string }): Garment {
  const category = a.category ?? "top";
  const color = a.color ?? "black";
  return {
    id: uid(),
    name: a.name || garmentName({ ...a, category, color }),
    ...a,
    category,
    color,
    colorHex: a.colorHex ?? hexOf(color),
  };
}
