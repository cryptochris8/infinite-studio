import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Title, TitleDetails } from "../shared/types.ts";
import { createApp } from "./app.ts";
import { Store } from "./store.ts";
import { TmdbError } from "./tmdb.ts";

const title: Title = {
  id: 1,
  mediaType: "movie",
  title: "Heat",
  overview: "A heist.",
  posterPath: "/p.jpg",
  backdropPath: "/b.jpg",
  year: 1995,
  rating: 7.9,
  voteCount: 100,
  genreIds: [28],
};
const details = {
  ...title,
  tagline: "",
  runtime: 170,
  genres: [],
  certification: "R",
  status: "Released",
  seasons: null,
  directors: [],
  cast: [],
  trailer: null,
  availability: { link: null, free: [], ads: [], subscription: [], rent: [], buy: [] },
  similar: [],
} satisfies TitleDetails;
const page = { page: 1, totalPages: 1, items: [title] };

describe("API", () => {
  let store: Store;
  const tmdb = {
    home: vi.fn(),
    list: vi.fn(),
    discover: vi.fn(),
    search: vi.fn(),
    genres: vi.fn(),
    details: vi.fn(),
  };
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.resetAllMocks();
    store = new Store(":memory:");
    app = createApp({ tmdb, store });
  });
  afterEach(() => store.close());

  const get = (path: string) => app.request(path);
  const send = (method: string, path: string, body?: unknown) =>
    app.request(path, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  it("reports health and disables caching of API responses", async () => {
    const res = await get("/api/health");
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("serves the home data", async () => {
    tmdb.home.mockResolvedValue({ hero: [title], rows: [] });
    expect(await (await get("/api/home")).json()).toEqual({ hero: [title], rows: [] });
  });

  describe("lists, browse and search", () => {
    it("returns a list page and passes the page number", async () => {
      tmdb.list.mockResolvedValue(page);
      const res = await get("/api/lists/upcoming?page=3");
      expect(res.status).toBe(200);
      expect(tmdb.list).toHaveBeenCalledWith("upcoming", 3);
    });

    it("404s on an unknown list and 400s on a bad page", async () => {
      expect((await get("/api/lists/nope")).status).toBe(404);
      expect((await get("/api/lists/upcoming?page=0")).status).toBe(400);
    });

    it("passes browse filters through", async () => {
      tmdb.discover.mockResolvedValue(page);
      await get("/api/browse/tv?genre=18&sort=vote_average.desc&page=2");
      expect(tmdb.discover).toHaveBeenCalledWith("tv", { genre: 18, sort: "vote_average.desc", page: 2 });
    });

    it("rejects a bad media type or sort", async () => {
      expect((await get("/api/browse/music")).status).toBe(400);
      expect((await get("/api/browse/movie?sort=drop table")).status).toBe(400);
    });

    it("searches, defaulting to an empty query", async () => {
      tmdb.search.mockResolvedValue(page);
      await get("/api/search?q=heat");
      expect(tmdb.search).toHaveBeenCalledWith("heat", 1);
      await get("/api/search");
      expect(tmdb.search).toHaveBeenLastCalledWith("", 1);
    });

    it("rejects an overlong search", async () => {
      expect((await get(`/api/search?q=${"a".repeat(101)}`)).status).toBe(400);
    });

    it("returns genres", async () => {
      tmdb.genres.mockResolvedValue([{ id: 28, name: "Action" }]);
      expect(await (await get("/api/genres/movie")).json()).toEqual([{ id: 28, name: "Action" }]);
    });
  });

  describe("title details", () => {
    it("returns details", async () => {
      tmdb.details.mockResolvedValue(details);
      const res = await get("/api/title/movie/1");
      expect(res.status).toBe(200);
      expect(tmdb.details).toHaveBeenCalledWith("movie", 1);
    });

    it("maps TMDB 404 to 404 and TMDB failures to 502", async () => {
      tmdb.details.mockRejectedValueOnce(new TmdbError("Not found", 404));
      expect((await get("/api/title/movie/9")).status).toBe(404);
      tmdb.details.mockRejectedValueOnce(new TmdbError("TMDB rejected the API key", 502));
      const res = await get("/api/title/movie/9");
      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({ error: "TMDB rejected the API key" });
    });

    it("rejects a non-numeric id", async () => {
      expect((await get("/api/title/movie/abc")).status).toBe(400);
    });

    it("hides unexpected errors behind a generic 500", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      tmdb.details.mockRejectedValue(new Error("secret internals"));
      const res = await get("/api/title/movie/1");
      expect(res.status).toBe(500);
      expect(JSON.stringify(await res.json())).not.toContain("secret");
    });
  });

  describe("profiles and watchlist", () => {
    it("lists, creates and deletes profiles", async () => {
      expect(await (await get("/api/profiles")).json()).toEqual([{ id: 1, name: "Family" }]);
      const created = await send("POST", "/api/profiles", { name: "Dad" });
      expect(created.status).toBe(201);
      expect(await created.json()).toEqual({ id: 2, name: "Dad" });
      expect((await send("DELETE", "/api/profiles/2")).status).toBe(204);
    });

    it("rejects duplicates, a missing body, and deleting the last profile", async () => {
      expect((await send("POST", "/api/profiles", { name: "family" })).status).toBe(409);
      expect((await send("POST", "/api/profiles", {})).status).toBe(400);
      expect((await send("DELETE", "/api/profiles/1")).status).toBe(409);
      expect((await send("DELETE", "/api/profiles/99")).status).toBe(404);
    });

    it("adds a title from TMDB data, lists it, and removes it", async () => {
      tmdb.details.mockResolvedValue({ ...details, cast: [{ id: 1, name: "x", character: "y", profilePath: null }] });
      expect((await send("PUT", "/api/profiles/1/watchlist/movie/1")).status).toBe(204);

      const list = (await (await get("/api/profiles/1/watchlist")).json()) as Title[];
      expect(list).toEqual([title]);
      expect(Object.keys(list[0]!)).not.toContain("cast");

      expect((await send("DELETE", "/api/profiles/1/watchlist/movie/1")).status).toBe(204);
      expect(await (await get("/api/profiles/1/watchlist")).json()).toEqual([]);
    });

    it("404s on the watchlist of a missing profile", async () => {
      expect((await get("/api/profiles/42/watchlist")).status).toBe(404);
    });

    it("does not save anything when the title lookup fails", async () => {
      tmdb.details.mockRejectedValue(new TmdbError("Not found", 404));
      expect((await send("PUT", "/api/profiles/1/watchlist/movie/5")).status).toBe(404);
      expect(store.watchlist(1)).toEqual([]);
    });
  });

  it("returns JSON 404 for unknown API paths", async () => {
    const res = await get("/api/nothing");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });
});

describe("Roku API", () => {
  let store: Store;
  const tmdb = {
    home: vi.fn(),
    list: vi.fn(),
    discover: vi.fn(),
    search: vi.fn(),
    genres: vi.fn(),
    details: vi.fn(),
  };
  const fetchFn = vi.fn();
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.resetAllMocks();
    store = new Store(":memory:");
    app = createApp({ tmdb, store, fetchFn: fetchFn as unknown as typeof fetch });
  });
  afterEach(() => store.close());

  // app.request() with a full URL sets the origin the image links are built from.
  const get = (path: string) => app.request(`http://192.168.68.59:8080${path}`);
  const post = (path: string, body: unknown) =>
    app.request(`http://192.168.68.59:8080${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

  it("serves home rows with absolute image links through the Pi", async () => {
    tmdb.home.mockResolvedValue({ hero: [], rows: [{ id: "trending", title: "Trending This Week", items: [title] }] });
    const res = await get("/api/roku/home");
    const body = (await res.json()) as { rows: { title: string; items: { id: string; posterUrl: string }[] }[] };
    expect(body.rows.map((r) => r.title)).toEqual(["Trending This Week"]);
    expect(body.rows[0]!.items[0]).toMatchObject({ id: "movie:1", posterUrl: "http://192.168.68.59:8080/img/w342/p.jpg" });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("puts the profile's My List first on home, and ignores a profile that no longer exists", async () => {
    tmdb.home.mockResolvedValue({ hero: [], rows: [{ id: "trending", title: "Trending This Week", items: [title] }] });
    store.addToWatchlist(1, { ...title, id: 2, title: "Ronin" });

    const withList = (await (await get("/api/roku/home?profile=1")).json()) as { rows: { title: string }[] };
    expect(withList.rows.map((r) => r.title)).toEqual(["My List", "Trending This Week"]);

    const res = await get("/api/roku/home?profile=99");
    expect(res.status).toBe(200);
    expect(((await res.json()) as { rows: { title: string }[] }).rows.map((r) => r.title)).toEqual([
      "Trending This Week",
    ]);
  });

  it("builds Movies and Shows screens from a popular row plus genre rows", async () => {
    tmdb.discover.mockResolvedValue(page);
    const body = (await (await get("/api/roku/browse/tv")).json()) as { rows: { title: string }[] };
    expect(body.rows[0]!.title).toBe("Popular Shows");
    expect(body.rows).toHaveLength(11);
    expect(tmdb.discover).toHaveBeenCalledWith("tv", {});
    expect(tmdb.discover).toHaveBeenCalledWith("tv", { genre: 10759 });
    expect((await get("/api/roku/browse/music")).status).toBe(400);
  });

  it("searches and lists a profile's saved titles", async () => {
    tmdb.search.mockResolvedValue(page);
    const found = (await (await get("/api/roku/search?q=heat")).json()) as { items: { id: string }[] };
    expect(found.items.map((i) => i.id)).toEqual(["movie:1"]);
    expect(tmdb.search).toHaveBeenCalledWith("heat", 1);

    store.addToWatchlist(1, title);
    const list = (await (await get("/api/roku/list/1")).json()) as { items: { id: string }[] };
    expect(list.items.map((i) => i.id)).toEqual(["movie:1"]);
    expect((await get("/api/roku/list/42")).status).toBe(404);
  });

  it("returns title details with whether the profile saved it", async () => {
    tmdb.details.mockResolvedValue(details);
    store.addToWatchlist(1, title);
    const saved = (await (await get("/api/roku/title/movie/1?profile=1")).json()) as {
      saved: boolean;
      metaLine: string;
    };
    expect(saved).toMatchObject({ saved: true, metaLine: "R · Movie · 1995 · 2h 50m" });
    const notSaved = (await (await get("/api/roku/title/movie/1")).json()) as { saved: boolean };
    expect(notSaved.saved).toBe(false);
    expect((await get("/api/roku/title/movie/abc")).status).toBe(400);
  });

  it("asks the Roku to open an app", async () => {
    fetchFn.mockResolvedValue(new Response(null, { status: 200 }));
    const res = await post("/api/roku/launch", { host: "192.168.68.20", channelId: "41468" });
    expect(res.status).toBe(204);
    expect(String(fetchFn.mock.calls[0]![0])).toBe("http://192.168.68.20:8060/launch/41468");
  });

  it("rejects bad launch requests and passes on the TV's refusal", async () => {
    expect((await post("/api/roku/launch", { host: "192.168.68.20", channelId: "abc" })).status).toBe(400);
    expect((await post("/api/roku/launch", { host: "1.2.3.4", channelId: "12" })).status).toBe(400);
    expect(fetchFn).not.toHaveBeenCalled();

    fetchFn.mockResolvedValue(new Response(null, { status: 403 }));
    const res = await post("/api/roku/launch", { host: "192.168.68.20", channelId: "12" });
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: string }).error).toContain("Control by mobile apps");
  });

  it("proxies TMDB images and rejects anything else", async () => {
    fetchFn.mockResolvedValue(new Response("img", { headers: { "content-type": "image/jpeg" } }));
    const res = await get("/img/w342/p.jpg");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("img");
    expect(fetchFn).toHaveBeenCalledWith("https://image.tmdb.org/t/p/w342/p.jpg");
    expect((await get("/img/huge/p.jpg")).status).toBe(400);
  });
});

describe("static serving", () => {
  it("serves the app shell for client-side routes but keeps /api as JSON", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ms-static-"));
    writeFileSync(join(dir, "index.html"), "<html>shell</html>");
    mkdirSync(join(dir, "assets"));
    writeFileSync(join(dir, "assets", "app.js"), "console.log(1)");
    const store = new Store(":memory:");
    const app = createApp({ tmdb: {} as never, store, staticDir: dir });

    expect(await (await app.request("/movie/123")).text()).toBe("<html>shell</html>");
    expect(await (await app.request("/assets/app.js")).text()).toBe("console.log(1)");
    expect((await app.request("/api/nothing")).headers.get("content-type")).toContain("application/json");
    store.close();
  });

  it("picks up a rebuilt index.html without a restart", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ms-static-"));
    writeFileSync(join(dir, "index.html"), "<html>v1</html>");
    const store = new Store(":memory:");
    const app = createApp({ tmdb: {} as never, store, staticDir: dir });

    expect(await (await app.request("/movie/1")).text()).toBe("<html>v1</html>");
    writeFileSync(join(dir, "index.html"), "<html>v2</html>");
    expect(await (await app.request("/movie/1")).text()).toBe("<html>v2</html>");
    store.close();
  });

  it("serves only the API when there is no build", async () => {
    const store = new Store(":memory:");
    const app = createApp({ tmdb: {} as never, store, staticDir: join(tmpdir(), "does-not-exist-ms") });
    expect((await app.request("/")).status).toBe(404);
    store.close();
  });
});
