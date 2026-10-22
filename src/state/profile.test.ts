// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Title } from "@shared/types.ts";

vi.mock("../api.ts", () => ({
  api: {
    profiles: vi.fn(),
    watchlist: vi.fn(),
    createProfile: vi.fn(),
    deleteProfile: vi.fn(),
    addToWatchlist: vi.fn(),
    removeFromWatchlist: vi.fn(),
  },
}));

import { api } from "../api.ts";
import { useProfile } from "./profile.ts";

const mocked = vi.mocked(api);
const title = (id: number, mediaType: Title["mediaType"] = "movie"): Title => ({
  id,
  mediaType,
  title: `T${id}`,
  overview: "",
  posterPath: null,
  backdropPath: null,
  year: 2000,
  rating: 7,
  voteCount: 10,
  genreIds: [],
});

const family = { id: 1, name: "Family" };
const kid = { id: 2, name: "Kid" };

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  useProfile.setState({ ready: false, error: null, profiles: [], current: null, watchlist: [] });
});

describe("init", () => {
  it("loads profiles, picks the first and loads its watchlist", async () => {
    mocked.profiles.mockResolvedValue([family, kid]);
    mocked.watchlist.mockResolvedValue([title(1)]);
    await useProfile.getState().init();
    const s = useProfile.getState();
    expect(s.ready).toBe(true);
    expect(s.current).toEqual(family);
    expect(s.watchlist).toHaveLength(1);
    expect(localStorage.getItem("multistream.profile")).toBe("1");
  });

  it("restores the previously chosen profile", async () => {
    localStorage.setItem("multistream.profile", "2");
    mocked.profiles.mockResolvedValue([family, kid]);
    mocked.watchlist.mockResolvedValue([]);
    await useProfile.getState().init();
    expect(useProfile.getState().current).toEqual(kid);
    expect(mocked.watchlist).toHaveBeenCalledWith(2);
  });

  it("falls back to the first profile when the saved one was deleted", async () => {
    localStorage.setItem("multistream.profile", "99");
    mocked.profiles.mockResolvedValue([family]);
    mocked.watchlist.mockResolvedValue([]);
    await useProfile.getState().init();
    expect(useProfile.getState().current).toEqual(family);
  });

  it("records an error but still becomes ready when the server is unreachable", async () => {
    mocked.profiles.mockRejectedValue(new Error("Can't reach the multistream server."));
    await useProfile.getState().init();
    expect(useProfile.getState()).toMatchObject({ ready: true, error: "Can't reach the multistream server.", current: null });
  });
});

describe("profiles", () => {
  beforeEach(async () => {
    mocked.profiles.mockResolvedValue([family]);
    mocked.watchlist.mockResolvedValue([]);
    await useProfile.getState().init();
  });

  it("adds a profile and switches to it", async () => {
    mocked.createProfile.mockResolvedValue(kid);
    await useProfile.getState().addProfile("Kid");
    expect(useProfile.getState().profiles).toEqual([family, kid]);
    expect(useProfile.getState().current).toEqual(kid);
  });

  it("switches to another remaining profile when the current one is removed", async () => {
    mocked.createProfile.mockResolvedValue(kid);
    await useProfile.getState().addProfile("Kid");
    await useProfile.getState().removeProfile(2);
    expect(useProfile.getState().profiles).toEqual([family]);
    expect(useProfile.getState().current).toEqual(family);
  });

  it("ignores selecting an unknown profile", async () => {
    await useProfile.getState().select(42);
    expect(useProfile.getState().current).toEqual(family);
  });
});

describe("watchlist", () => {
  beforeEach(async () => {
    mocked.profiles.mockResolvedValue([family]);
    mocked.watchlist.mockResolvedValue([]);
    await useProfile.getState().init();
  });

  it("saves a title immediately and tells the server", async () => {
    mocked.addToWatchlist.mockResolvedValue(undefined);
    const promise = useProfile.getState().toggleSaved(title(5));
    expect(useProfile.getState().isSaved(title(5))).toBe(true);
    await promise;
    expect(mocked.addToWatchlist).toHaveBeenCalledWith(1, "movie", 5);
  });

  it("removes a saved title", async () => {
    mocked.addToWatchlist.mockResolvedValue(undefined);
    mocked.removeFromWatchlist.mockResolvedValue(undefined);
    await useProfile.getState().toggleSaved(title(5));
    await useProfile.getState().toggleSaved(title(5));
    expect(useProfile.getState().isSaved(title(5))).toBe(false);
    expect(mocked.removeFromWatchlist).toHaveBeenCalledWith(1, "movie", 5);
  });

  it("rolls back and rethrows when the server rejects the change", async () => {
    mocked.addToWatchlist.mockRejectedValue(new Error("down"));
    await expect(useProfile.getState().toggleSaved(title(5))).rejects.toThrow("down");
    expect(useProfile.getState().isSaved(title(5))).toBe(false);
  });

  it("treats a movie and a show with the same id as different titles", async () => {
    mocked.addToWatchlist.mockResolvedValue(undefined);
    await useProfile.getState().toggleSaved(title(5, "movie"));
    expect(useProfile.getState().isSaved(title(5, "tv"))).toBe(false);
  });

  it("puts the newest save first", async () => {
    mocked.addToWatchlist.mockResolvedValue(undefined);
    await useProfile.getState().toggleSaved(title(1));
    await useProfile.getState().toggleSaved(title(2));
    expect(useProfile.getState().watchlist.map((t) => t.id)).toEqual([2, 1]);
  });
});
