import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Title } from "../shared/types.ts";
import { MAX_PROFILES, Store } from "./store.ts";

const title = (id: number, name = `Title ${id}`, mediaType: Title["mediaType"] = "movie"): Title => ({
  id,
  mediaType,
  title: name,
  overview: "",
  posterPath: null,
  backdropPath: null,
  year: 2000,
  rating: 7,
  voteCount: 10,
  genreIds: [],
});

describe("Store", () => {
  let store: Store;
  beforeEach(() => {
    store = new Store(":memory:");
  });
  afterEach(() => store.close());

  describe("profiles", () => {
    it("starts with a default profile", () => {
      expect(store.profiles()).toEqual([{ id: 1, name: "Family" }]);
    });

    it("creates profiles with trimmed names", () => {
      expect(store.createProfile("  Dad ")).toEqual({ id: 2, name: "Dad" });
      expect(store.profiles().map((p) => p.name)).toEqual(["Family", "Dad"]);
    });

    it("rejects blank, too long and duplicate names (case-insensitive)", () => {
      expect(() => store.createProfile("   ")).toThrow(/required/);
      expect(() => store.createProfile("x".repeat(31))).toThrow(/30 characters/);
      expect(() => store.createProfile("family")).toThrow(/already exists/);
    });

    it("caps the number of profiles", () => {
      for (let i = store.profiles().length; i < MAX_PROFILES; i++) store.createProfile(`P${i}`);
      expect(() => store.createProfile("One too many")).toThrow(/Up to/);
    });

    it("deletes a profile and its watchlist but never the last one", () => {
      const kid = store.createProfile("Kid");
      store.addToWatchlist(kid.id, title(1));
      store.deleteProfile(kid.id);
      expect(store.profiles()).toHaveLength(1);
      expect(() => store.watchlist(kid.id)).toThrow(/not found/);
      expect(() => store.deleteProfile(1)).toThrow(/last profile/);
    });

    it("reports a missing profile as not found", () => {
      expect(() => store.deleteProfile(99)).toThrowError(expect.objectContaining({ status: 404 }));
    });
  });

  describe("watchlist", () => {
    it("returns newest additions first", () => {
      store.addToWatchlist(1, title(1), 1000);
      store.addToWatchlist(1, title(2), 2000);
      expect(store.watchlist(1).map((t) => t.id)).toEqual([2, 1]);
    });

    it("keeps the saved title details", () => {
      store.addToWatchlist(1, title(7, "Heat"));
      expect(store.watchlist(1)[0]).toMatchObject({ id: 7, title: "Heat", year: 2000 });
    });

    it("ignores adding the same title twice, but a movie and show can share an id", () => {
      store.addToWatchlist(1, title(5, "Movie five", "movie"));
      store.addToWatchlist(1, title(5, "Movie five again", "movie"));
      store.addToWatchlist(1, title(5, "Show five", "tv"));
      expect(store.watchlist(1).map((t) => t.title).sort()).toEqual(["Movie five", "Show five"]);
    });

    it("keeps watchlists separate per profile", () => {
      const kid = store.createProfile("Kid");
      store.addToWatchlist(1, title(1));
      expect(store.watchlist(kid.id)).toEqual([]);
    });

    it("removes only the matching title and is quiet when it isn't there", () => {
      store.addToWatchlist(1, title(1));
      store.addToWatchlist(1, title(1, "Show", "tv"));
      store.removeFromWatchlist(1, "movie", 1);
      store.removeFromWatchlist(1, "movie", 404);
      expect(store.watchlist(1).map((t) => t.mediaType)).toEqual(["tv"]);
    });

    it("rejects an unknown profile", () => {
      expect(() => store.addToWatchlist(42, title(1))).toThrow(/not found/);
    });
  });
});
