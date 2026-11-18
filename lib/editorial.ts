/**
 * MY GALA edits — named for what they are. Photography is hot-linked from Unsplash;
 * every image has a quiet fallback. Replace any URL here with your own campaign photos.
 */
import type { Nudge } from "./types";

const U = (id: string, w = 1400) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const IMAGES = {
  heroLeft: U("photo-1515886657613-9f3515b0c78f", 1400),
  heroRight: U("photo-1509631179647-0177331693ae", 1400),
  college: U("photo-1529139574466-a303027c1d8b"),
  office: U("photo-1485968579580-b6d095142e6e"),
  weekend: U("photo-1490481651871-ab68de25d43d"),
  date: U("photo-1496747611176-843222e1e57c"),
  party: U("photo-1539109136881-3be0616acf4b"),
  festive: U("photo-1610030469983-98e550d6193c"),
  wedding: U("photo-1583391733956-3750e0ff4e8b"),
  travel: U("photo-1469334031218-e382a71b716b"),
  mine: U("photo-1434389677669-e08b4cac3105"),
  fitting: U("photo-1515886657613-9f3515b0c78f", 1200),
};

export type EditSlug = "college" | "office" | "weekend" | "date" | "party" | "festive" | "wedding" | "travel" | "mine";

export interface Piece {
  id: string;
  label: string; // one word, shown as a tab
  anchor: string; // garment fed to the stylist
  nudges?: Nudge[];
}

export interface Edit {
  slug: EditSlug;
  name: string;
  occasion?: string;
  image: keyof typeof IMAGES;
  fallback: string;
  nudges?: Nudge[];
  pieces: Piece[];
}

export const EDITS: Edit[] = [
  { slug: "college", name: "College", occasion: "college", image: "college", fallback: "Blue straight-fit jeans", nudges: ["casual"],
    pieces: [{ id: "jeans", label: "Jeans", anchor: "Blue straight-fit jeans" }, { id: "tee", label: "Tee", anchor: "White heavyweight tee" }, { id: "kurti", label: "Kurti", anchor: "Indigo block print kurti" }] },
  { slug: "office", name: "Office", occasion: "work", image: "office", fallback: "Black tailored blazer",
    pieces: [{ id: "blazer", label: "Blazer", anchor: "Black tailored blazer" }, { id: "shirt", label: "Shirt", anchor: "White crisp shirt" }, { id: "trousers", label: "Trousers", anchor: "Beige wide-leg trousers" }] },
  { slug: "weekend", name: "Weekend", occasion: "weekend", image: "weekend", fallback: "Grey heavyweight tee", nudges: ["casual"],
    pieces: [{ id: "tee", label: "Tee", anchor: "Grey heavyweight tee" }, { id: "dress", label: "Dress", anchor: "Sage shirt dress" }, { id: "trench", label: "Trench", anchor: "Beige trench coat" }] },
  { slug: "date", name: "Date Night", occasion: "date night", image: "date", fallback: "Black satin slip dress", nudges: ["elegant"],
    pieces: [{ id: "slip", label: "Slip dress", anchor: "Black satin slip dress" }, { id: "skirt", label: "Skirt", anchor: "Burgundy satin midi skirt" }, { id: "top", label: "Top", anchor: "Ivory satin camisole" }] },
  { slug: "party", name: "Party", occasion: "party", image: "party", fallback: "Fuchsia satin corset top", nudges: ["experimental"],
    pieces: [{ id: "corset", label: "Corset", anchor: "Fuchsia satin corset top" }, { id: "mini", label: "Mini", anchor: "Black leather mini skirt" }, { id: "trousers", label: "Trousers", anchor: "Red satin wide trousers" }] },
  { slug: "festive", name: "Festive", occasion: "festive", image: "festive", fallback: "Ivory chikankari kurta",
    pieces: [{ id: "kurta", label: "Kurta", anchor: "Ivory chikankari kurta" }, { id: "saree", label: "Saree", anchor: "Black saree with gold detailing" }, { id: "suit", label: "Suit", anchor: "Emerald silk salwar suit" }] },
  { slug: "wedding", name: "Wedding", occasion: "wedding", image: "wedding", fallback: "Red silk lehenga", nudges: ["elegant"],
    pieces: [{ id: "lehenga", label: "Lehenga", anchor: "Red silk lehenga" }, { id: "saree", label: "Saree", anchor: "Gold silk saree with zari border" }, { id: "sharara", label: "Sharara", anchor: "Blush georgette sharara" }] },
  { slug: "travel", name: "Travel", occasion: "travel", image: "travel", fallback: "Navy linen shirt", nudges: ["casual"],
    pieces: [{ id: "linen", label: "Linen", anchor: "Navy linen shirt" }, { id: "knit", label: "Knit", anchor: "Camel cashmere sweater" }, { id: "jumpsuit", label: "Jumpsuit", anchor: "Olive jumpsuit" }] },
  { slug: "mine", name: "My Edit", image: "mine", fallback: "White cotton shirt", pieces: [] },
];

export const editBySlug = (s: string) => EDITS.find((e) => e.slug === s);
