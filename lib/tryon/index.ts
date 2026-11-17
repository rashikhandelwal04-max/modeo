import "server-only";
import { fashn } from "./providers/fashn";
import { replicate } from "./providers/replicate";
import type { TryOnProvider, TryOnRequest } from "./types";

/** Provider registry — add new try-on services here; nothing else needs to change. */
export const PROVIDERS: TryOnProvider[] = [fashn, replicate];

export function providerByName(name: string) {
  return PROVIDERS.find((p) => p.name === name);
}

/** Pick the best configured provider for this request (garment-image try-on first). */
export function selectProvider(req: TryOnRequest): { provider?: TryOnProvider; reason?: string } {
  const configured = PROVIDERS.filter((p) => p.configured());
  if (!configured.length) return { reason: "no-provider" };
  const p = configured.find((x) => x.supports(req));
  if (!p) return { reason: "needs-garment-image" };
  return { provider: p };
}

export function defaultProviderName(): "fashn" | "replicate" | null {
  return (PROVIDERS.find((p) => p.configured())?.name as "fashn" | "replicate") ?? null;
}
