/**
 * MY GALA editorial content — the five Edits and campaign imagery.
 *
 * Imagery: photographs are hot-linked from Unsplash (free licence; hot-linking is
 * Unsplash's own recommended usage). Every image has an illustrated fallback, so a
 * blocked or missing photo never leaves a hole. Swap any URL here to re-shoot a page.
 */
import type { Nudge } from "./types";

const U = (id: string, w = 1400) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const IMAGES = {
  heroMain: U("photo-1509631179647-0177331693ae", 1600),
  heroSecond: U("photo-1515886657613-9f3515b0c78f", 900),
  daily: U("photo-1485968579580-b6d095142e6e"),
  statement: U("photo-1539109136881-3be0616acf4b"),
  classic: U("photo-1496747611176-843222e1e57c"),
  desi: U("photo-1610030469983-98e550d6193c"),
  yours: U("photo-1490481651871-ab68de25d43d"),
  fitting: U("photo-1529139574466-a303027c1d8b"),
};

export type EditSlug = "daily" | "statement" | "classic" | "desi" | "yours";

export interface Chapter {
  id: string;
  label: string;
  anchor: string; // garment description fed to the stylist
  occasion?: string;
  nudges?: Nudge[];
  note: string; // handwritten editor's note
}

export interface Edit {
  slug: EditSlug;
  number: string;
  title: [string, string]; // two lines; second is set in italic
  kicker: string;
  intro: string;
  image: keyof typeof IMAGES;
  fallback: string; // garment drawn when the photo can't load
  chapters: Chapter[];
}

export const EDITS: Edit[] = [
  {
    slug: "daily",
    number: "01",
    title: ["The Daily", "Edit"],
    kicker: "Everyday, elevated.",
    intro: "College mornings, office days, slow weekends. The clothes you actually live in, styled like they matter, because they do.",
    image: "daily",
    fallback: "Blue straight-fit jeans",
    chapters: [
      { id: "college", label: "College", anchor: "Blue straight-fit jeans", occasion: "college", nudges: ["casual"], note: "Comfort first. Then one sharp detail." },
      { id: "office", label: "Office", anchor: "White crisp shirt", occasion: "work", note: "Tuck it. Roll it. Own the room." },
      { id: "weekend", label: "Weekends", anchor: "Grey heavyweight tee", occasion: "weekend", nudges: ["casual"], note: "Easy, but never sloppy." },
      { id: "chic", label: "Casual chic", anchor: "Beige trench coat", occasion: "brunch", note: "The coat does the talking." },
    ],
  },
  {
    slug: "statement",
    number: "02",
    title: ["The Statement", "Edit"],
    kicker: "Turn the volume up.",
    intro: "Colour that clashes on purpose, silhouettes that take up space and accessories that start conversations. Bold, dramatic, unmistakably you.",
    image: "statement",
    fallback: "Fuchsia satin corset top",
    chapters: [
      { id: "clash", label: "Colour clash", anchor: "Fuchsia satin corset top", nudges: ["experimental", "colourful"], note: "Pink + red? Yes. Always." },
      { id: "drama", label: "Drama", anchor: "Red satin wide trousers", occasion: "party", nudges: ["experimental"], note: "Volume on the leg, sharp on top." },
      { id: "leather", label: "Hard edges", anchor: "Black leather mini skirt", occasion: "party", nudges: ["experimental"], note: "Add hardware. Then more." },
      { id: "jewels", label: "Statement jewellery", anchor: "Gold statement earrings", occasion: "date night", nudges: ["experimental"], note: "One piece. Maximum noise." },
    ],
  },
  {
    slug: "classic",
    number: "03",
    title: ["The Classic", "Edit"],
    kicker: "Quiet. Timeless. Certain.",
    intro: "Minimal lines, elegant fabrics and colours that never date. The pieces you'll still wear in ten years, styled with precision.",
    image: "classic",
    fallback: "Camel wool coat",
    chapters: [
      { id: "tailoring", label: "Tailoring", anchor: "Black tailored blazer", occasion: "work", nudges: ["minimal", "elegant"], note: "Sharp shoulders, soft everything else." },
      { id: "mono", label: "Monochrome", anchor: "Ivory silk blouse", nudges: ["minimal"], note: "Tone on tone. Texture does the work." },
      { id: "coat", label: "The coat", anchor: "Camel wool coat", nudges: ["elegant"], note: "Investment. Wear it everywhere." },
      { id: "evening", label: "Evening", anchor: "Black satin slip dress", occasion: "date night", nudges: ["elegant"], note: "Less jewellery. More presence." },
    ],
  },
  {
    slug: "desi",
    number: "04",
    title: ["The Desi", "Edit"],
    kicker: "Heritage, worn your way.",
    intro: "Sarees, kurtas, lehengas and blouses, from handloom to haute. Contemporary Indian dressing and fusion styling with real draping, jewellery and colour logic.",
    image: "desi",
    fallback: "Black saree with gold detailing",
    chapters: [
      { id: "saree", label: "The saree", anchor: "Black saree with gold detailing", occasion: "festive", note: "Gold on black. Never fails." },
      { id: "kurta", label: "Kurta days", anchor: "Ivory chikankari kurta", occasion: "casual", note: "Oxidised silver keeps it modern." },
      { id: "lehenga", label: "Lehenga", anchor: "Red silk lehenga", occasion: "wedding", nudges: ["elegant"], note: "Let the dupatta fall from one shoulder." },
      { id: "fusion", label: "Fusion", anchor: "Indigo block print kurti", nudges: ["experimental"], note: "Kurti + denim. Rules? Optional." },
    ],
  },
  {
    slug: "yours",
    number: "05",
    title: ["Your Own", "Edit"],
    kicker: "Made by you.",
    intro: "Your saved looks, your personal creations and new combinations built only from what's already in your wardrobe.",
    image: "yours",
    fallback: "White cotton shirt",
    chapters: [],
  },
];

export const editBySlug = (s: string) => EDITS.find((e) => e.slug === s);
