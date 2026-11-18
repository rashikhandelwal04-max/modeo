/**
 * Campaign imagery. Put your own photographs in /public/campaign (hero-left.jpg, hero-right.jpg).
 * If they are missing and the image service is connected, MY GALA generates editorial
 * black-and-white photographs from the prompts below; otherwise the layout is pure black type.
 */
export const CAMPAIGN = {
  left: {
    file: "/campaign/hero-left.jpg",
    prompt: "Black and white high fashion editorial photograph, elegant woman in a white silk slip dress and long black leather opera gloves, holding a black wool coat, minimalist light grey studio, soft natural light, full length, magazine campaign, 35mm film grain, sophisticated, no text",
  },
  right: {
    file: "/campaign/hero-right.jpg",
    prompt: "Black and white high fashion editorial photograph, stylish man in a sharp oversized black tailored suit with crisp white shirt, minimalist studio with window light shadows on the floor, full length, luxury menswear campaign, 35mm film grain, no text",
  },
};

export const OCCASIONS = [
  { id: "date night", label: "Date Night", prompt: "Black and white fashion editorial photograph, woman in an elegant black satin slip dress at night, city lights bokeh, cinematic, no text" },
  { id: "work", label: "Work", prompt: "Black and white fashion editorial photograph, woman in a tailored blazer and wide-leg trousers walking in a modern office lobby, no text" },
  { id: "party", label: "Party", prompt: "Black and white fashion editorial photograph, woman in a sequin mini dress dancing, flash photography, high contrast, no text" },
  { id: "casual", label: "Casual Day Out", prompt: "Black and white fashion editorial photograph, woman in white shirt and straight jeans walking on a sunny street, relaxed chic, no text" },
  { id: "festive", label: "Wedding / Festive", prompt: "Black and white fashion editorial photograph, Indian woman in an elegant silk saree with gold jewellery, palace corridor, graceful, no text" },
  { id: "specific", label: "Something Specific", prompt: "Black and white fashion editorial photograph, neatly arranged clothes on a rail in a minimalist studio, no people, no text" },
];
