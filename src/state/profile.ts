import { create } from "zustand";
import type { Title } from "@shared/types.ts";
import { api, type Profile } from "../api.ts";

const STORAGE_KEY = "multistream.profile";

function readSaved(): number | null {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function save(id: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(id));
  } catch {
    /* private mode or blocked storage: the choice just won't persist */
  }
}

export const watchKey = (t: Pick<Title, "mediaType" | "id">) => `${t.mediaType}:${t.id}`;

interface ProfileState {
  ready: boolean;
  error: string | null;
  profiles: Profile[];
  current: Profile | null;
  /** The current profile's watchlist, newest first. */
  watchlist: Title[];
  init: () => Promise<void>;
  select: (id: number) => Promise<void>;
  addProfile: (name: string) => Promise<void>;
  removeProfile: (id: number) => Promise<void>;
  isSaved: (t: Pick<Title, "mediaType" | "id">) => boolean;
  toggleSaved: (t: Title) => Promise<void>;
}

export const useProfile = create<ProfileState>((set, get) => ({
  ready: false,
  error: null,
  profiles: [],
  current: null,
  watchlist: [],

  async init() {
    try {
      const profiles = await api.profiles();
      const saved = readSaved();
      const current = profiles.find((p) => p.id === saved) ?? profiles[0] ?? null;
      const watchlist = current ? await api.watchlist(current.id) : [];
      if (current) save(current.id);
      set({ profiles, current, watchlist, ready: true, error: null });
    } catch (error) {
      set({ ready: true, error: error instanceof Error ? error.message : "Couldn't load profiles" });
    }
  },

  async select(id) {
    const profile = get().profiles.find((p) => p.id === id);
    if (!profile) return;
    const watchlist = await api.watchlist(id);
    save(id);
    set({ current: profile, watchlist });
  },

  async addProfile(name) {
    const created = await api.createProfile(name);
    set({ profiles: [...get().profiles, created] });
    await get().select(created.id);
  },

  async removeProfile(id) {
    await api.deleteProfile(id);
    const profiles = get().profiles.filter((p) => p.id !== id);
    set({ profiles });
    if (get().current?.id === id && profiles[0]) await get().select(profiles[0].id);
  },

  isSaved(t) {
    const key = watchKey(t);
    return get().watchlist.some((w) => watchKey(w) === key);
  },

  async toggleSaved(title) {
    const { current, watchlist } = get();
    if (!current) return;
    const key = watchKey(title);
    const wasSaved = watchlist.some((w) => watchKey(w) === key);

    // Update the heart immediately, undo if the server says no.
    set({ watchlist: wasSaved ? watchlist.filter((w) => watchKey(w) !== key) : [title, ...watchlist] });
    try {
      if (wasSaved) await api.removeFromWatchlist(current.id, title.mediaType, title.id);
      else await api.addToWatchlist(current.id, title.mediaType, title.id);
    } catch (error) {
      if (get().current?.id === current.id) set({ watchlist });
      throw error;
    }
  },
}));
