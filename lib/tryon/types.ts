export interface TryOnRequest {
  /** person photograph as a data URL (JPEG/PNG) */
  personImage: string;
  /** optional garment photo (data URL or https URL) — required by garment-image providers */
  garmentImage?: string;
  garmentCategory?: "tops" | "bottoms" | "one-pieces" | "auto";
  /** text description of the full outfit, for text-guided providers */
  outfitDescription: string;
}

export interface TryOnPoll {
  status: "processing" | "completed" | "failed";
  /** result image as a data URL (fetched server-side so provider URLs never expire on the client) */
  image?: string;
  error?: string;
}

export interface TryOnProvider {
  name: "fashn" | "replicate";
  label: string;
  configured(): boolean;
  /** can this provider handle the request (e.g. does it need a garment image)? */
  supports(req: TryOnRequest): boolean;
  start(req: TryOnRequest): Promise<string>;
  poll(id: string): Promise<TryOnPoll>;
}
