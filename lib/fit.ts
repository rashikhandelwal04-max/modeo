/**
 * MY GALA fit intelligence — proportion guidance from height, weight and a self-chosen body shape.
 * Inputs are approximate and chosen by the user. The aim is to explain what each cut does
 * (longer, taller, more balanced) — never to "correct" a body.
 */
import type { StyleProfile } from "./types";

export type BodyShape = "hourglass" | "pear" | "apple" | "rectangle" | "inverted" | "unsure";

export const BODY_SHAPES: { id: BodyShape; label: string; hint: string }[] = [
  { id: "hourglass", label: "Hourglass", hint: "Shoulders and hips similar, defined waist" },
  { id: "pear", label: "Pear", hint: "Hips wider than shoulders" },
  { id: "apple", label: "Apple", hint: "Fuller through the middle" },
  { id: "rectangle", label: "Rectangle", hint: "Shoulders, waist and hips similar" },
  { id: "inverted", label: "Inverted triangle", hint: "Shoulders wider than hips" },
];

export type Height = "petite" | "average" | "tall";
export type Build = "slim" | "average" | "curvy" | "full";

export interface Fit {
  height?: Height;
  build?: Build;
  shape?: BodyShape;
  cm?: number;
}

export function fitOf(p?: Partial<StyleProfile>): Fit {
  const cm = p?.heightCm;
  const kg = p?.weightKg;
  const height: Height | undefined = cm ? (cm < 161 ? "petite" : cm > 172 ? "tall" : "average") : undefined;
  let build: Build | undefined;
  if (cm && kg) {
    const bmi = kg / (cm / 100) ** 2;
    build = bmi < 18.5 ? "slim" : bmi < 25 ? "average" : bmi < 30 ? "curvy" : "full";
  }
  return { height, build, shape: p?.bodyShape as BodyShape | undefined, cm };
}

export interface Rule { title: string; why: string }

/** The minimal "Your fit" summary — 3–4 rules, each with what it does for you. */
export function fitSummary(f: Fit): { headline: string; lead: string; rules: Rule[]; easy: string[] } {
  const rules: Rule[] = [];
  const easy: string[] = [];
  const add = (title: string, why: string) => { if (!rules.some((r) => r.title === title)) rules.push({ title, why }); };

  if (f.height === "petite") {
    add("High waist", "Moves your waistline up, so your legs read longer.");
    add("One colour, head to toe", "A dark or tonal column — or a co-ord — draws one vertical line. You look taller.");
    add("Full-length or ankle hems", "With a pointed or skin-tone shoe, the leg line doesn't break.");
    easy.push("Mid-calf hems that cut the leg", "Long, boxy tops worn untucked");
  } else if (f.height === "tall") {
    add("Play with proportion", "Cropped jackets, wide legs and colour-blocking sit beautifully on your frame.");
    add("Volume welcome", "Maxi lengths and wide trousers carry easily — flats work as well as heels.");
  }

  switch (f.shape) {
    case "pear":
      add("Detail above the waist", "Square, boat or off-shoulder necklines broaden the shoulder line and balance the hips.");
      add("Straight or wide leg", "Skims the hip and falls cleanly — darker and plain below works best.");
      easy.push("Skinny cuts in light colours", "Hip-level pockets and embellishment");
      break;
    case "apple":
      add("Open necklines", "V-necks and wraps lengthen the torso and draw the eye up.");
      add("Fluid over clingy", "Soft drape and longline layers create a long, easy line.");
      add("Straight-leg bottoms", "Balance the frame from hip to hem.");
      easy.push("Tight waistbands and belts at the middle", "Very short, cropped tops");
      break;
    case "hourglass":
      add("Define the waist", "Wraps, tucked tops and belts follow your natural shape.");
      add("Fitted, not boxy", "Tailoring that follows the curve looks sharper than oversized shapes.");
      easy.push("Shapeless, boxy layers");
      break;
    case "rectangle":
      add("Create a waist", "Belts, peplums, wraps and tucks add shape at the middle.");
      add("Wide legs and A-lines", "Volume below adds curve and movement.");
      break;
    case "inverted":
      add("Volume below", "Wide-leg trousers, A-line and pleated skirts balance strong shoulders.");
      add("Clean shoulders", "Simple V or scoop necks; skip shoulder pads and puff sleeves.");
      easy.push("Puff sleeves and shoulder detail");
      break;
  }

  if (f.build === "curvy" || f.build === "full") add("Structure with drape", "Fabrics with some weight hold their shape and skim rather than cling.");
  if (f.build === "slim") add("Texture and layers", "Knits, pleats and layering add dimension.");
  if (rules.length < 3) add("Tuck it in", "A tucked or cropped top keeps your waistline clear.");

  const parts = [f.height && cap(f.height), f.shape && f.shape !== "unsure" && BODY_SHAPES.find((s) => s.id === f.shape)?.label].filter(Boolean) as string[];
  const lead = f.height === "petite" ? "Long, unbroken lines make you look taller." : f.height === "tall" ? "You can carry volume and contrast." : f.shape === "pear" || f.shape === "inverted" ? "Balance top and bottom." : "Follow your natural line.";
  return { headline: parts.join(" · ") || "Your fit", lead, rules: rules.slice(0, 4), easy: easy.slice(0, 3) };
}

/** Recommended details for a bottom the user hasn't described ("guess what works for me"). */
export function suggestedBottom(f: Fit): { rise?: string; fit?: string; length?: string; colourHint?: string; why: string } | null {
  if (!f.height && !f.shape) return null;
  const fitPick = f.shape === "inverted" || f.shape === "rectangle" ? "Wide-leg" : f.shape === "apple" ? "Straight" : f.shape === "pear" ? "Straight" : f.height === "tall" ? "Wide-leg" : "Straight";
  return {
    rise: "High-waisted",
    fit: fitPick,
    length: f.height === "petite" ? "Full-length" : undefined,
    colourHint: f.height === "petite" ? "dark or tonal" : undefined,
    why: f.height === "petite" ? "High waist and full length lengthen your leg line." : "Chosen to balance your proportions.",
  };
}

/** Score and explain a pairing option for this person. Tags describe what the garment does. */
export function bodyScore(tags: string[], f: Fit, anchorTags: string[]): { score: number; forYou?: string } {
  let s = 0;
  let forYou: string | undefined;
  let best = 0;
  const has = (t: string) => tags.includes(t);
  const note = (w: number, why: string) => { s += w; if (w > best) { best = w; forYou = why; } };
  if (f.height === "petite") {
    if (has("cropped") || has("tuck")) note(1.2, "Shows your waist — legs read longer");
    if (has("highwaist")) note(1.4, "High waist lengthens your legs");
    if (has("longline")) s -= 1;
    if (has("fulllength")) note(0.8, "Full length keeps the line unbroken");
    if (has("midcalf")) s -= 0.8;
  }
  if (f.height === "tall" && (has("wideleg") || has("cropped"))) note(0.6, "Plays with your proportions");
  switch (f.shape) {
    case "pear":
      if (has("shoulderdetail") || has("boatneck")) note(1.3, "Detail up top balances the hips");
      if (has("straight") || has("wideleg") || has("aline")) note(1, "Skims the hip");
      if (has("skinny") || has("hipdetail")) s -= 1.2;
      break;
    case "apple":
      if (has("vneck") || has("wrap")) note(1.3, "Open neckline lengthens the torso");
      if (has("fluid") || has("longline")) note(0.8, "Soft drape, long line");
      if (has("cropped") || has("bodycon")) s -= 1.2;
      break;
    case "hourglass":
      if (has("wrap") || has("tuck") || has("fitted")) note(1.2, "Follows your waist");
      if (has("boxy") || has("oversized")) s -= 1;
      break;
    case "rectangle":
      if (has("peplum") || has("wrap") || has("belted")) note(1.2, "Creates shape at the waist");
      if (has("wideleg") || has("aline")) note(0.8, "Adds movement below");
      break;
    case "inverted":
      if (has("wideleg") || has("aline") || has("pleated")) note(1.2, "Volume below balances the shoulders");
      if (has("vneck")) note(0.6, "Clean, simple shoulder line");
      if (has("shoulderdetail") || has("puff")) s -= 1.2;
      break;
  }
  if ((f.build === "curvy" || f.build === "full") && has("bodycon")) s -= 0.6;
  // pairing with the garment itself
  if (anchorTags.includes("volume") && (has("fitted") || has("cropped") || has("tuck"))) note(0.9, "Fitted on top balances the volume below");
  if (anchorTags.includes("slim") && (has("relaxed") || has("oversized") || has("longline"))) note(0.7, "Ease on top balances a slim leg");
  if (anchorTags.includes("fitted") && (has("wideleg") || has("aline"))) note(0.7, "Volume below balances a fitted top");
  return { score: s, forYou };
}

export function anchorTagsFor(a: { category?: string; fit?: string; silhouette?: string; length?: string; rise?: string }): string[] {
  const t = `${a.fit ?? ""} ${a.silhouette ?? ""} ${a.length ?? ""} ${a.rise ?? ""}`.toLowerCase();
  const tags: string[] = [];
  if (/wide|flared|a-line|pleated|tiered|palazzo|relaxed|oversized/.test(t) || a.category === "palazzo") tags.push("volume");
  if (/slim|skinny|pencil|bodycon|fitted/.test(t)) tags.push(/fitted/.test(t) && !/skinny|slim|pencil/.test(t) ? "fitted" : "slim");
  return tags;
}

/** Words for the on-model photo so the model resembles the user's figure. */
export function modelDescription(f: Fit, who: "woman" | "man"): string {
  const h = f.height === "petite" ? `petite (about ${f.cm ?? 157} cm)` : f.height === "tall" ? `tall (about ${f.cm} cm)` : f.cm ? `average height (about ${f.cm} cm)` : "average height";
  const b = f.build === "slim" ? "slim" : f.build === "curvy" ? "curvy, fuller" : f.build === "full" ? "plus-size" : f.build === "average" ? "healthy average-build, not thin" : "average-build";
  const shape = f.shape && f.shape !== "unsure" ? `, ${f.shape === "inverted" ? "inverted-triangle" : f.shape}-shaped figure` : "";
  return `a realistic ${h}, ${b} ${who}${shape} — a real everyday body, not a tall thin fashion model`;
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
