"use client";
/**
 * App state. Phase 1–2 persistence is local-first: metadata in localStorage, images in
 * IndexedDB (see images.ts). The `Repository` boundary is this file — swapping to Supabase
 * (Phase 3) means replacing load/save here without touching UI components.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Garment, IntegrationStatus, Look, PhotoRecord, SavedLook, StyleProfile, WardrobeItem } from "../types";
import { clearImages, deleteImage } from "./images";
import { uid } from "../util";

export const DEFAULT_COLLECTIONS = ["Work", "College", "Weekend", "Travel", "Party", "Weddings"];

export const DEFAULT_PROFILE: StyleProfile = {
  aesthetics: [],
  colors: [],
  avoidColors: [],
  fits: [],
  categories: [],
  budget: "mid",
  occasions: [],
  comfort: [],
  affinity: {},
  recent: [],
};

export interface StudioSession {
  anchor?: Garment;
  anchorOwned?: boolean;
  looks?: Look[];
  occasion?: string;
}

export interface TryOnSession {
  look: Look;
  variants: Look[];
}

interface Persisted {
  v: 1;
  onboarded: boolean;
  photo: PhotoRecord | null;
  wardrobe: WardrobeItem[];
  saved: SavedLook[];
  collections: string[];
  profile: StyleProfile;
  studio: StudioSession;
  tryOn: TryOnSession | null;
}

const KEY = "modeo:v1";

const INITIAL: Persisted = {
  v: 1,
  onboarded: false,
  photo: null,
  wardrobe: [],
  saved: [],
  collections: DEFAULT_COLLECTIONS,
  profile: DEFAULT_PROFILE,
  studio: {},
  tryOn: null,
};

interface Ctx extends Persisted {
  ready: boolean;
  status: IntegrationStatus | null;
  set: (patch: Partial<Persisted> | ((s: Persisted) => Partial<Persisted>)) => void;
  setPhoto: (p: PhotoRecord | null) => Promise<void>;
  addWardrobe: (items: WardrobeItem[]) => void;
  updateWardrobe: (id: string, patch: Partial<WardrobeItem>) => void;
  removeWardrobe: (id: string) => Promise<void>;
  saveLook: (look: Look, opts?: { collection?: string; name?: string; tryOnImageId?: string }) => SavedLook;
  updateSaved: (id: string, patch: Partial<SavedLook>) => void;
  removeSaved: (id: string) => Promise<void>;
  isSaved: (lookId: string) => boolean;
  feedback: (look: Look, delta: number) => void;
  rememberShown: (looks: Look[]) => void;
  resetAll: () => Promise<void>;
  toast: (msg: string) => void;
  toastMsg: string | null;
}

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>(INITIAL);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [toastMsg, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw) as Persisted;
        setState({ ...INITIAL, ...p, profile: { ...DEFAULT_PROFILE, ...p.profile } });
      }
    } catch {}
    setReady(true);
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {
        // no MODEO server (e.g. static demo build) — style locally, never call /api
        (window as unknown as { __MODEO_OFFLINE?: boolean }).__MODEO_OFFLINE = true;
        setStatus({ claude: false, tryOn: null, tryOnProviders: { fashn: false, replicate: false } });
      });
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // storage full — keep running in memory
    }
  }, [state, ready]);

  const set = useCallback<Ctx["set"]>((patch) => {
    setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  }, []);

  const toast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const value = useMemo<Ctx>(() => {
    const setPhoto = async (p: PhotoRecord | null) => {
      const old = state.photo;
      if (old && (!p || p.imageId !== old.imageId)) await deleteImage(old.imageId);
      set({ photo: p });
    };
    return {
      ...state,
      ready,
      status,
      set,
      toast,
      toastMsg,
      setPhoto,
      addWardrobe: (items) => set((s) => ({ wardrobe: [...items, ...s.wardrobe] })),
      updateWardrobe: (id, patch) => set((s) => ({ wardrobe: s.wardrobe.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
      removeWardrobe: async (id) => {
        const it = state.wardrobe.find((w) => w.id === id);
        if (it?.imageId) await deleteImage(it.imageId);
        set((s) => ({ wardrobe: s.wardrobe.filter((w) => w.id !== id) }));
      },
      saveLook: (look, opts) => {
        const saved: SavedLook = {
          id: uid("saved_"),
          look,
          name: opts?.name ?? look.title,
          savedAt: Date.now(),
          collection: opts?.collection ?? "",
          notes: "",
          tryOnImageId: opts?.tryOnImageId,
        };
        set((s) => {
          // learning: saving a look is positive feedback on each of its pieces
          const affinity = { ...s.profile.affinity };
          for (const p of look.pieces) if (!p.anchor) affinity[p.key] = Math.min(5, (affinity[p.key] ?? 0) + 1);
          return { saved: [saved, ...s.saved], profile: { ...s.profile, affinity } };
        });
        return saved;
      },
      updateSaved: (id, patch) => set((s) => ({ saved: s.saved.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeSaved: async (id) => {
        const it = state.saved.find((x) => x.id === id);
        if (it?.tryOnImageId) await deleteImage(it.tryOnImageId);
        set((s) => ({ saved: s.saved.filter((x) => x.id !== id) }));
      },
      isSaved: (lookId) => state.saved.some((x) => x.look.id === lookId),
      feedback: (look, delta) =>
        set((s) => {
          const affinity = { ...s.profile.affinity };
          for (const p of look.pieces) if (!p.anchor) affinity[p.key] = Math.max(-5, Math.min(5, (affinity[p.key] ?? 0) + delta));
          return { profile: { ...s.profile, affinity } };
        }),
      rememberShown: (looks) =>
        set((s) => {
          const keys = looks.flatMap((l) => l.pieces.filter((p) => !p.anchor).map((p) => p.key));
          return { profile: { ...s.profile, recent: [...keys, ...s.profile.recent].slice(0, 60) } };
        }),
      resetAll: async () => {
        await clearImages();
        localStorage.removeItem(KEY);
        setState(INITIAL);
      },
    };
  }, [state, ready, status, set, toast, toastMsg]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside AppProvider");
  return c;
}
