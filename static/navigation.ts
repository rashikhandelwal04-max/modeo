"use client";
// Hash-router shim so the app runs as a single static page (artifact / any static host).
import { useSyncExternalStore } from "react";

export function toHash(href: string) {
  const [path, query] = href.split("?");
  const name = path.replace(/^\//, "") || "";
  const start = new URLSearchParams(query ?? "").get("start");
  return "#" + (start ? `${name}-${start}` : name);
}
function current() {
  return typeof location === "undefined" ? "" : location.hash.replace(/^#/, "");
}
function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}
export function useHash() {
  return useSyncExternalStore(subscribe, current, () => "");
}
const STARTS = ["build", "aesthetic", "occasion"];
export function parseHash(h: string) {
  const m = /^(studio)-(build|aesthetic|occasion)$/.exec(h);
  if (m && STARTS.includes(m[2])) return { path: "/" + m[1], start: m[2] };
  return { path: "/" + h, start: null as string | null };
}
export function useRouter() {
  return {
    push: (href: string) => { location.hash = toHash(href); window.scrollTo(0, 0); },
    replace: (href: string) => { location.replace(toHash(href)); },
    back: () => history.back(),
  };
}
export function usePathname() {
  return parseHash(useHash()).path;
}
export function useSearchParams() {
  const { start } = parseHash(useHash());
  return new URLSearchParams(start ? { start } : {});
}
