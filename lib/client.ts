"use client";
import { generateLooks, type EngineInput } from "./styling/engine";
import type { Garment, Look, Nudge, StyleProfile, WardrobeItem } from "./types";

export interface StyleCall {
  anchor: Garment;
  anchorOwned?: boolean;
  nudges?: Nudge[];
  wardrobe?: WardrobeItem[];
  mode?: "explore" | "wardrobe";
  profile?: StyleProfile;
  occasion?: string;
  season?: string;
  seed?: number;
}

/** Ask the server stylist (Claude when configured, rules otherwise). Falls back locally if offline. */
export async function requestLooks(call: StyleCall): Promise<{ looks: Look[]; engine: "claude" | "rules"; notice?: string }> {
  const strip = (g: Garment) => ({ ...g, imageUrl: undefined });
  const body = {
    ...call,
    anchor: { ...call.anchor },
    wardrobe: call.wardrobe?.map(strip),
    seed: call.seed ?? Math.floor(Math.random() * 1e9),
  };
  try {
    if ((window as unknown as { __MYGALA_OFFLINE?: boolean }).__MYGALA_OFFLINE) throw new Error("offline");
    const res = await fetch("/api/style", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch {
    const input: EngineInput = { ...call, season: call.season as EngineInput["season"], seed: body.seed };
    return { looks: generateLooks(input), engine: "rules", notice: undefined };
  }
}

export function currentSeason(): "spring" | "summer" | "monsoon" | "autumn" | "winter" {
  const m = new Date().getMonth();
  return m <= 1 || m === 11 ? "winter" : m <= 3 ? "spring" : m <= 5 ? "summer" : m <= 8 ? "monsoon" : "autumn";
}
