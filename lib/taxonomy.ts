import type { Category, Family, Role } from "./types";

export interface CategoryInfo {
  label: string;
  family: Family;
  role: Role;
  /** words used to recognise the category in free text */
  words: string[];
}

export const CATEGORIES: Record<Category, CategoryInfo> = {
  shirt: { label: "Shirt", family: "western", role: "top", words: ["shirt", "button-down", "button down", "oxford"] },
  tshirt: { label: "T-shirt", family: "western", role: "top", words: ["t-shirt", "tshirt", "tee", "t shirt"] },
  top: { label: "Top", family: "western", role: "top", words: ["top", "bodysuit", "corset", "crop top"] },
  camisole: { label: "Camisole", family: "western", role: "top", words: ["camisole", "cami", "slip top"] },
  tank: { label: "Tank top", family: "western", role: "top", words: ["tank", "vest top", "singlet"] },
  knit: { label: "Knitwear", family: "western", role: "top", words: ["sweater", "jumper", "knit", "cardigan", "pullover", "turtleneck"] },
  blouse: { label: "Blouse", family: "western", role: "top", words: ["blouse"] },
  blazer: { label: "Blazer", family: "western", role: "layer", words: ["blazer", "suit jacket", "sport coat"] },
  jacket: { label: "Jacket", family: "western", role: "layer", words: ["jacket", "bomber", "denim jacket", "leather jacket", "shacket"] },
  coat: { label: "Coat", family: "western", role: "layer", words: ["coat", "trench", "overcoat", "parka"] },
  trousers: { label: "Trousers", family: "western", role: "bottom", words: ["trousers", "pants", "slacks", "chinos", "wide-leg", "cargo"] },
  jeans: { label: "Jeans", family: "western", role: "bottom", words: ["jeans", "denims", "denim pants"] },
  shorts: { label: "Shorts", family: "western", role: "bottom", words: ["shorts", "bermuda"] },
  skirt: { label: "Skirt", family: "western", role: "bottom", words: ["skirt"] },
  dress: { label: "Dress", family: "western", role: "onepiece", words: ["dress", "gown", "slip dress", "sundress"] },
  jumpsuit: { label: "Jumpsuit", family: "western", role: "onepiece", words: ["jumpsuit", "playsuit", "romper", "co-ord"] },
  saree: { label: "Saree", family: "indian", role: "drape", words: ["saree", "sari"] },
  "saree-blouse": { label: "Saree blouse", family: "indian", role: "top", words: ["saree blouse", "choli"] },
  kurta: { label: "Kurta", family: "indian", role: "onepiece", words: ["kurta", "kurtas"] },
  kurti: { label: "Kurti", family: "indian", role: "top", words: ["kurti", "short kurta", "tunic"] },
  lehenga: { label: "Lehenga", family: "indian", role: "drape", words: ["lehenga", "ghagra", "lehnga"] },
  "salwar-suit": { label: "Salwar suit", family: "indian", role: "onepiece", words: ["salwar", "salwar suit", "anarkali", "churidar suit", "suit set"] },
  palazzo: { label: "Palazzo", family: "indian", role: "bottom", words: ["palazzo", "palazzos", "sharara", "gharara"] },
  churidar: { label: "Churidar", family: "indian", role: "bottom", words: ["churidar", "leggings"] },
  dupatta: { label: "Dupatta", family: "indian", role: "dupatta", words: ["dupatta", "stole", "odhni"] },
  "ethnic-jacket": { label: "Ethnic jacket", family: "indian", role: "layer", words: ["nehru jacket", "ethnic jacket", "bandhgala", "koti", "waistcoat"] },
  "indo-western": { label: "Indo-western", family: "indian", role: "onepiece", words: ["indo-western", "indo western", "dhoti", "cape set"] },
  sneakers: { label: "Sneakers", family: "accessory", role: "footwear", words: ["sneakers", "trainers", "sneaker"] },
  loafers: { label: "Loafers", family: "accessory", role: "footwear", words: ["loafers", "loafer", "brogues", "oxfords"] },
  heels: { label: "Heels", family: "accessory", role: "footwear", words: ["heels", "pumps", "stilettos", "mules", "slingbacks"] },
  boots: { label: "Boots", family: "accessory", role: "footwear", words: ["boots", "ankle boots", "chelsea"] },
  flats: { label: "Flats", family: "accessory", role: "footwear", words: ["flats", "ballet flats", "ballerinas"] },
  sandals: { label: "Sandals", family: "accessory", role: "footwear", words: ["sandals", "slides", "strappy"] },
  juttis: { label: "Juttis", family: "accessory", role: "footwear", words: ["jutti", "juttis", "mojari", "mojaris"] },
  kolhapuris: { label: "Kolhapuris", family: "accessory", role: "footwear", words: ["kolhapuri", "kolhapuris"] },
  earrings: { label: "Earrings", family: "accessory", role: "jewellery", words: ["earrings", "studs", "hoops"] },
  jhumkas: { label: "Jhumkas", family: "accessory", role: "jewellery", words: ["jhumka", "jhumkas", "chandbali", "chandbalis"] },
  necklace: { label: "Necklace", family: "accessory", role: "jewellery", words: ["necklace", "pendant", "chain", "choker"] },
  bangles: { label: "Bangles", family: "accessory", role: "jewellery", words: ["bangles", "bracelet", "kada", "cuff"] },
  ring: { label: "Ring", family: "accessory", role: "jewellery", words: ["ring", "rings"] },
  watch: { label: "Watch", family: "accessory", role: "accessory", words: ["watch"] },
  bag: { label: "Bag", family: "accessory", role: "bag", words: ["bag", "handbag", "tote", "shoulder bag", "crossbody"] },
  clutch: { label: "Clutch", family: "accessory", role: "bag", words: ["clutch", "minaudiere"] },
  potli: { label: "Potli", family: "accessory", role: "bag", words: ["potli"] },
  belt: { label: "Belt", family: "accessory", role: "accessory", words: ["belt"] },
  scarf: { label: "Scarf", family: "accessory", role: "accessory", words: ["scarf", "silk scarf", "bandana"] },
  sunglasses: { label: "Sunglasses", family: "accessory", role: "accessory", words: ["sunglasses", "shades"] },
};

export const ALL_CATEGORIES = Object.keys(CATEGORIES) as Category[];

export const CATEGORY_GROUPS: { label: string; items: Category[] }[] = [
  { label: "Western", items: ["shirt", "tshirt", "top", "camisole", "tank", "knit", "blouse", "trousers", "jeans", "shorts", "skirt", "dress", "jumpsuit", "blazer", "jacket", "coat"] },
  { label: "Indian", items: ["saree", "saree-blouse", "kurta", "kurti", "lehenga", "salwar-suit", "palazzo", "churidar", "dupatta", "ethnic-jacket", "indo-western"] },
  { label: "Footwear", items: ["sneakers", "loafers", "heels", "boots", "flats", "sandals", "juttis", "kolhapuris"] },
  { label: "Accessories", items: ["earrings", "jhumkas", "necklace", "bangles", "ring", "watch", "bag", "clutch", "potli", "belt", "scarf", "sunglasses"] },
];

export const ATTRIBUTE_OPTIONS = {
  length: ["cropped", "hip", "mini", "knee", "midi", "maxi", "ankle", "full-length"],
  fabric: ["cotton", "linen", "silk", "satin", "chiffon", "georgette", "wool", "cashmere", "denim", "leather", "suede", "knit", "crepe", "organza", "velvet", "tweed", "banarasi silk", "kanjeevaram silk", "chanderi", "khadi", "polyester"],
  fit: ["fitted", "slim", "regular", "relaxed", "oversized", "tailored", "straight"],
  silhouette: ["A-line", "straight", "wide-leg", "bodycon", "boxy", "column", "flared", "pleated", "wrap", "draped", "tapered", "bias-cut"],
  pattern: ["solid", "stripes", "check", "floral", "polka dot", "animal", "paisley", "embroidered", "block print", "zari border", "graphic", "abstract"],
  occasion: ["work", "college", "casual", "weekend", "date night", "party", "wedding", "festive", "travel", "formal", "brunch", "interview"],
  season: ["spring", "summer", "monsoon", "autumn", "winter"],
  style: ["minimal", "classic", "romantic", "edgy", "sporty", "bohemian", "glam", "preppy", "streetwear", "traditional", "contemporary"],
} as const;

export const AESTHETICS = [
  "Minimalist", "Old money", "Streetwear", "Quiet luxury", "Casual chic", "Contemporary",
  "Bohemian", "Classic", "Formal", "Experimental", "Indian contemporary",
];

export function categoryLabel(c: Category) {
  return CATEGORIES[c]?.label ?? c;
}
export function roleOf(c: Category): Role {
  return CATEGORIES[c]?.role ?? "accessory";
}
export function familyOf(c: Category): Family {
  return CATEGORIES[c]?.family ?? "accessory";
}
export function isIndian(c: Category) {
  return CATEGORIES[c]?.family === "indian";
}
