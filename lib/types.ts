// Core domain types for MY GALA.

export type Family = "western" | "indian" | "accessory";

/** Structural role a piece plays inside an outfit. */
export type Role =
  | "top"
  | "bottom"
  | "onepiece" // dress, jumpsuit, kurta set worn alone
  | "drape" // saree, lehenga set
  | "layer" // blazer, jacket, coat, ethnic jacket
  | "dupatta"
  | "footwear"
  | "jewellery"
  | "bag"
  | "accessory"; // belts, scarves, sunglasses, watches

export type Category =
  // western tops & layers
  | "shirt" | "tshirt" | "top" | "camisole" | "tank" | "knit" | "blouse"
  | "blazer" | "jacket" | "coat"
  // western bottoms & one-pieces
  | "trousers" | "jeans" | "shorts" | "skirt" | "dress" | "jumpsuit"
  // indian
  | "saree" | "saree-blouse" | "kurta" | "kurti" | "lehenga" | "salwar-suit"
  | "palazzo" | "churidar" | "dupatta" | "ethnic-jacket" | "indo-western"
  // footwear
  | "sneakers" | "loafers" | "heels" | "boots" | "flats" | "sandals" | "juttis" | "kolhapuris"
  // accessories
  | "earrings" | "jhumkas" | "necklace" | "bangles" | "ring" | "watch" | "bag" | "clutch"
  | "potli" | "belt" | "scarf" | "sunglasses";

export type Direction = "minimal" | "casual" | "bold" | "contemporary";

export type Nudge =
  | "minimal" | "experimental" | "formal" | "casual" | "colourful" | "elegant" | "affordable";

export type Season = "spring" | "summer" | "monsoon" | "autumn" | "winter";

export interface GarmentAttributes {
  category: Category;
  color: string; // named colour from palette, e.g. "black"
  colorHex?: string;
  length?: string;
  fabric?: string;
  fit?: string;
  silhouette?: string;
  pattern?: string;
  occasion?: string[];
  season?: Season[];
  style?: string[];
  detail?: string; // e.g. "gold detailing"
  neckline?: string;
  sleeve?: string;
  rise?: string;
  shade?: string; // the user's own name for the exact shade, e.g. "mustard"
}

export interface Garment extends GarmentAttributes {
  id: string;
  name: string;
  imageId?: string; // key in the local image store
  imageUrl?: string; // remote product image (from a pasted URL)
}

export interface WardrobeItem extends Garment {
  addedAt: number;
  sample?: boolean; // part of the optional sample wardrobe
  aiDetected?: boolean; // attributes came from the vision model
}

export interface Piece {
  role: Role;
  slot: string; // unique slot within a look (e.g. "top", "jewellery-1")
  garment: Garment;
  /** item template key, used for learning & de-duplication */
  key: string;
  owned: boolean; // owned by the user (wardrobe or the garment they submitted)
  anchor?: boolean; // the garment being styled
}

export interface Annotation {
  slot: string;
  text: string;
}

export interface Look {
  id: string;
  direction: Direction;
  title: string;
  pieces: Piece[];
  palette: { name: string; hex: string }[];
  why: string[]; // explanation bullets
  occasions: string[];
  annotations: Annotation[];
  notes?: string[]; // extra styling notes: draping, hair, etc.
  engine: "claude" | "rules";
  /** engine bookkeeping so pieces can be regenerated individually */
  meta?: LookMeta;
}

export interface Palette {
  base: string[];
  accent: string;
  metal: "gold" | "silver";
  shoe: string;
  denim: string;
}

export interface LookMeta {
  pal: Palette;
  target: number; // target formality
  ctx: "western" | "indian";
  seed: number;
}

export interface SavedLook {
  id: string;
  look: Look;
  name: string;
  savedAt: number;
  collection: string;
  notes: string;
  tryOnImageId?: string; // generated try-on image in local store
}

export interface StyleProfile {
  aesthetics: string[];
  colors: string[];
  avoidColors: string[];
  fits: string[];
  categories: string[];
  budget: "accessible" | "mid" | "investment";
  occasions: string[];
  comfort: string[];
  /** learned affinity per item key (positive = liked) */
  affinity: Record<string, number>;
  /** recently shown item keys — used to avoid repetition */
  recent: string[];
  /** optional, approximate inputs for proportion advice — never used to judge */
  heightCm?: number;
  weightKg?: number;
  askedBody?: boolean;
}

export interface PhotoRecord {
  imageId: string;
  addedAt: number;
  consentProcessing: boolean;
  consentTraining: boolean; // always separate; MY GALA itself never trains
}

export interface IntegrationStatus {
  claude: boolean;
  claudeModel?: string;
  tryOn: "fashn" | "replicate" | "huggingface" | null;
  tryOnProviders: { fashn: boolean; replicate: boolean; huggingface?: boolean };
  /** photorealistic garment image generation available */
  imageGen?: boolean;
}
