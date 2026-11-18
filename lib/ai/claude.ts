import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { ALL_CATEGORIES, ATTRIBUTE_OPTIONS } from "../taxonomy";
import { COLORS } from "../colors";
import type { Category, Direction, Garment, Look, Nudge, Piece, StyleProfile, WardrobeItem } from "../types";
import { annotate, buildPalette, formalityOf } from "../styling/engine";
import { familyOf, roleOf } from "../taxonomy";
import { hexOf } from "../colors";
import { rng, uid } from "../util";

export const CLAUDE_MODEL = process.env.MYGALA_CLAUDE_MODEL || process.env.MODEO_CLAUDE_MODEL || "claude-opus-5-5";

export function claudeConfigured() {
  return !!process.env.ANTHROPIC_API_KEY;
}

let client: Anthropic | null = null;
function getClient() {
  if (!client) client = new Anthropic(); // reads ANTHROPIC_API_KEY on the server only
  return client;
}

const CategoryEnum = z.enum(ALL_CATEGORIES as [Category, ...Category[]]);
const ColorEnum = z.enum(COLORS.map((c) => c.name) as [string, ...string[]]);

// ---------------------------------------------------------------------------
// Garment recognition (vision)
// ---------------------------------------------------------------------------
const GarmentSchema = z.object({
  is_garment: z.boolean().describe("false if the image does not show a clothing item, footwear or accessory"),
  name: z.string().describe("short editorial product name, e.g. 'Oversized black wool blazer'"),
  category: CategoryEnum,
  color: ColorEnum.describe("closest colour from the list for the dominant colour"),
  fabric: z.string().describe("fabric if visually identifiable, else empty string"),
  fit: z.string().describe(`one of: ${ATTRIBUTE_OPTIONS.fit.join(", ")}, or empty`),
  silhouette: z.string().describe(`one of: ${ATTRIBUTE_OPTIONS.silhouette.join(", ")}, or empty`),
  length: z.string().describe(`one of: ${ATTRIBUTE_OPTIONS.length.join(", ")}, or empty`),
  pattern: z.string().describe(`one of: ${ATTRIBUTE_OPTIONS.pattern.join(", ")}`),
  detail: z.string().describe("notable detail such as 'gold zari border', else empty"),
  occasion: z.array(z.string()).describe(`from: ${ATTRIBUTE_OPTIONS.occasion.join(", ")}`),
  season: z.array(z.enum(["spring", "summer", "monsoon", "autumn", "winter"])),
  style: z.array(z.string()).describe(`from: ${ATTRIBUTE_OPTIONS.style.join(", ")}`),
});
export type GarmentAnalysis = z.infer<typeof GarmentSchema>;

export async function analyzeGarmentImage(base64: string, mediaType: "image/jpeg" | "image/png" | "image/webp"): Promise<GarmentAnalysis> {
  const res = await getClient().messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(GarmentSchema) },
    system:
      "You are MY GALA's garment-recognition model. Identify the single main garment or accessory in the photo for a digital wardrobe. Support Western and Indian clothing (sarees, kurtas, lehengas, dupattas, etc.). Only report fabric when it is reasonably identifiable; never guess wildly. Do not describe any person in the image beyond the garment.",
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: "Catalogue this item." },
        ],
      },
    ],
  });
  if (res.stop_reason === "refusal") throw new Error("The model declined to analyse this image.");
  if (!res.parsed_output) throw new Error("Could not parse garment analysis.");
  return res.parsed_output;
}

// ---------------------------------------------------------------------------
// Styling
// ---------------------------------------------------------------------------
const LookSchema = z.object({
  looks: z.array(
    z.object({
      direction: z.enum(["minimal", "casual", "bold", "contemporary"]),
      title: z.string().describe("2–4 word editorial title"),
      pieces: z.array(
        z.object({
          slot: z.string().describe("unique slot id: top, bottom, layer, blouse, dupatta, footwear, earrings, necklace, bangles, jewellery-1, jewellery-2, bag, accessory"),
          category: CategoryEnum,
          color: ColorEnum,
          name: z.string().describe("editorial piece name including colour, e.g. 'Ivory satin camisole'"),
          fabric: z.string(),
          wardrobe_id: z.string().describe("id of the user's wardrobe item if this piece is one they own, else empty string"),
        }),
      ).describe("pieces OTHER than the anchor garment"),
      why: z.array(z.string()).describe("3–4 bullets prefixed 'Colour:', 'Proportion:', 'Texture:', 'Finish:' explaining why it works"),
      occasions: z.array(z.string()).describe("2–3 occasions"),
      annotations: z.array(z.object({ slot: z.string(), text: z.string().describe("short designer's note, max 8 words") })).describe("2–3 notes; slot may be 'anchor'"),
      notes: z.array(z.string()).describe("for sarees/lehengas/kurtas: 'Drape: …', 'Hair: …'; else empty"),
    }),
  ),
});

export interface StyleRequest {
  anchor: Garment;
  anchorOwned?: boolean;
  nudges?: Nudge[];
  wardrobe?: WardrobeItem[];
  mode?: "explore" | "wardrobe";
  profile?: Partial<StyleProfile>;
  occasion?: string;
  season?: string;
}

export async function styleWithClaude(req: StyleRequest): Promise<Look[]> {
  const wardrobe = (req.wardrobe ?? []).slice(0, 80).map((w) => ({ id: w.id, name: w.name, category: w.category, color: w.color, fabric: w.fabric }));
  const p = req.profile ?? {};
  const brief = {
    anchor: { name: req.anchor.name, category: req.anchor.category, color: req.anchor.color, fabric: req.anchor.fabric, fit: req.anchor.fit, silhouette: req.anchor.silhouette, length: req.anchor.length, pattern: req.anchor.pattern, detail: req.anchor.detail },
    mode: req.mode ?? "explore",
    requested_adjustments: req.nudges ?? [],
    occasion: req.occasion ?? null,
    season: req.season ?? null,
    profile: { aesthetics: p.aesthetics, favourite_colours: p.colors, avoid_colours: p.avoidColors, preferred_fits: p.fits, budget: p.budget, occasions: p.occasions, comfort: p.comfort },
    recently_shown_piece_keys: (p.recent ?? []).slice(0, 20),
    wardrobe,
  };
  const res = await getClient().messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium", format: zodOutputFormat(LookSchema) },
    system: `You are MY GALA, a world-class personal stylist with an editorial eye (think fashion-magazine creative director) who is equally fluent in Western and Indian dress.
Create exactly four distinct looks around the anchor garment, one per direction: minimal (minimal & sophisticated), casual (casual & effortless), bold (bold & experimental), contemporary (contemporary & fashion-forward).
Rules:
- Every look must be complete: clothing needed to wear the anchor, footwear, accessories/jewellery and (where relevant) a bag.
- Recommendations must be specific to the anchor garment. For sarees: blouse style, jewellery (earrings, necklace, bangles), bag, footwear, plus Drape and Hair notes. For lehengas: choli, dupatta, jewellery. For kurtas: bottoms, dupatta or jacket.
- Reason with colour theory, proportion, silhouette, texture, fabric, occasion, season and the user's profile. Explain WHY each look works.
- Avoid repeating the same pieces across the four looks and avoid recently shown pieces where reasonable.
- Mode "wardrobe": use ONLY items from the wardrobe list (set wardrobe_id). If something essential is missing, omit it and say so in notes. Mode "explore": prefer owned items when they work (set wardrobe_id) and suggest new items otherwise (wardrobe_id empty).
- Apply requested adjustments (more minimal / experimental / formal / casual / colourful / elegant / affordable).
- Honour avoid_colours. Use only colours from the allowed list.`,
    messages: [{ role: "user", content: JSON.stringify(brief) }],
  });
  if (res.stop_reason === "refusal") throw new Error("refusal");
  const out = res.parsed_output;
  if (!out || !out.looks?.length) throw new Error("empty");
  const owned = new Map((req.wardrobe ?? []).map((w) => [w.id, w]));
  const seed = Date.now();
  return out.looks.slice(0, 4).map((l, i) => {
    const anchorPiece: Piece = { role: roleOf(req.anchor.category), slot: "anchor", garment: req.anchor, key: "anchor", owned: req.anchorOwned ?? true, anchor: true };
    const pieces: Piece[] = [anchorPiece];
    const seen = new Set<string>(["anchor"]);
    for (const pc of l.pieces) {
      let slot = pc.slot || pc.category;
      while (seen.has(slot)) slot += "-2";
      seen.add(slot);
      const w = pc.wardrobe_id ? owned.get(pc.wardrobe_id) : undefined;
      if (req.mode === "wardrobe" && !w) continue;
      pieces.push({
        role: roleOf(w?.category ?? pc.category),
        slot,
        key: w ? "own:" + w.id : "ai:" + pc.name.toLowerCase().replace(/[^a-z]+/g, "-"),
        owned: !!w,
        garment: w ?? { id: uid(), name: pc.name, category: pc.category, color: pc.color, colorHex: hexOf(pc.color), fabric: pc.fabric || undefined },
      });
    }
    const dir = l.direction as Direction;
    const engineInput = { anchor: req.anchor, nudges: req.nudges, profile: req.profile };
    const pal = buildPalette(req.anchor, dir, engineInput, rng(seed + i));
    const annotations = l.annotations.filter((a) => pieces.some((p) => p.slot === a.slot)).slice(0, 3);
    return {
      id: uid("look_"),
      direction: dir,
      title: l.title,
      pieces,
      palette: Array.from(new Set(pieces.map((p) => p.garment.color))).map((name) => ({ name, hex: hexOf(name) })),
      why: l.why,
      occasions: l.occasions,
      annotations: annotations.length ? annotations : annotate(pieces, pal, dir),
      notes: l.notes?.length ? l.notes : undefined,
      engine: "claude" as const,
      meta: { pal, target: formalityOf(req.anchor), ctx: familyOf(req.anchor.category) === "indian" ? "indian" : "western", seed: seed + i },
    } satisfies Look;
  });
}
