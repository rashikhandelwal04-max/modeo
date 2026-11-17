"use client";
/**
 * Private on-device image store (IndexedDB). Personal photographs and wardrobe photos
 * stay in this browser. They are only transmitted when the user explicitly asks for an
 * AI action (garment analysis or virtual try-on), and only to the configured provider.
 */
import { useEffect, useState } from "react";

const DB = "modeo-images";
const STORE = "images";
const memory = new Map<string, string>();
const listeners = new Map<string, Set<() => void>>();

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function notify(id: string) {
  listeners.get(id)?.forEach((f) => f());
}

export async function putImage(id: string, dataUrl: string) {
  memory.set(id, dataUrl);
  try {
    await tx("readwrite", (s) => s.put(dataUrl, id));
  } catch {
    // storage unavailable (private window / sandbox) — keep it in memory for this session
  }
  notify(id);
}

export async function getImage(id: string): Promise<string | undefined> {
  if (memory.has(id)) return memory.get(id);
  try {
    const v = (await tx<string | undefined>("readonly", (s) => s.get(id) as IDBRequest<string | undefined>)) ?? undefined;
    if (v) memory.set(id, v);
    return v;
  } catch {
    return undefined;
  }
}

export async function deleteImage(id: string) {
  memory.delete(id);
  try {
    await tx("readwrite", (s) => s.delete(id));
  } catch {}
  notify(id);
}

export async function clearImages() {
  memory.clear();
  try {
    await tx("readwrite", (s) => s.clear());
  } catch {}
}

export function useImage(id?: string) {
  const [src, setSrc] = useState<string | undefined>(id ? memory.get(id) : undefined);
  useEffect(() => {
    if (!id) {
      setSrc(undefined);
      return;
    }
    let alive = true;
    const load = () => getImage(id).then((v) => alive && setSrc(v));
    load();
    const set = listeners.get(id) ?? new Set();
    set.add(load);
    listeners.set(id, set);
    return () => {
      alive = false;
      set.delete(load);
    };
  }, [id]);
  return src;
}
