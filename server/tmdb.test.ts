import { describe, expect, it, vi } from "vitest";
import { Tmdb, TmdbError, toDetails, toTitle } from "./tmdb.ts";

const movieResult = {
  id: 1,
  title: "Heat",
  overview: "A heist.",
  poster_path: "/p.jpg",
  backdrop_path: "/b.jpg",
  release_date: "1995-12-15",
  vote_average: 7.9123,
  vote_count: 9000,
  genre_ids: [28, 80],
};
const tvResult = { id: 2, name: "Severance", overview: "Work.", first_air_date: "2022-02-18", vote_average: 8.4 };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function makeTmdb(handler: (url: URL, init?: RequestInit) => Response, apiKey = "key123") {
  const fetchFn = vi.fn(async (input: URL | string | Request, init?: RequestInit) =>
    handler(new URL(input instanceof Request ? input.url : String(input)), init),
  );
  return { tmdb: new Tmdb({ apiKey, fetchFn: fetchFn as unknown as typeof fetch }), fetchFn };
}

describe("toTitle", () => {
  it("normalizes a movie", () => {
    expect(toTitle(movieResult, "movie")).toEqual({
      id: 1,
      mediaType: "movie",
      title: "Heat",
      overview: "A heist.",
      posterPath: "/p.jpg",
      backdropPath: "/b.jpg",
      year: 1995,
      rating: 7.9,
      voteCount: 9000,
      genreIds: [28, 80],
    });
  });

  it("normalizes a tv show using name and first_air_date", () => {
    const t = toTitle({ ...tvResult, media_type: "tv" });
    expect(t).toMatchObject({ mediaType: "tv", title: "Severance", year: 2022, posterPath: null, genreIds: [] });
  });

  it("returns null for people and results with no usable type", () => {
    expect(toTitle({ id: 3, name: "Al Pacino", media_type: "person" })).toBeNull();
    expect(toTitle({ id: 4, title: "No type" })).toBeNull();
  });

  it("gives a null year for a missing or bad date", () => {
    expect(toTitle({ ...movieResult, release_date: "" }, "movie")?.year).toBeNull();
    expect(toTitle({ ...movieResult, release_date: undefined }, "movie")?.year).toBeNull();
  });
});

describe("Tmdb requests", () => {
  it("sends a v3 key as a query parameter", async () => {
    const { tmdb, fetchFn } = makeTmdb(() => jsonResponse({ results: [movieResult] }), "key123");
    await tmdb.list("popular-movies");
    const url = fetchFn.mock.calls[0]![0] as URL;
    expect(url.searchParams.get("api_key")).toBe("key123");
    expect(url.pathname).toBe("/3/movie/popular");
    expect(url.searchParams.get("region")).toBe("US");
  });

  it("sends a v4 read token as a bearer header and not in the URL", async () => {
    const { tmdb, fetchFn } = makeTmdb(() => jsonResponse({ results: [] }), "eyJhbGciOi.token");
    await tmdb.list("trending");
    const [url, init] = fetchFn.mock.calls[0]! as [URL, RequestInit];
    expect(url.searchParams.has("api_key")).toBe(false);
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer eyJhbGciOi.token");
  });

  it("filters people out of trending and tags the media type", async () => {
    const { tmdb } = makeTmdb(() =>
      jsonResponse({
        page: 1,
        total_pages: 3,
        results: [
          { ...movieResult, media_type: "movie" },
          { ...tvResult, media_type: "tv" },
          { id: 9, name: "Someone", media_type: "person" },
        ],
      }),
    );
    const page = await tmdb.list("trending");
    expect(page.items.map((t) => [t.mediaType, t.title])).toEqual([
      ["movie", "Heat"],
      ["tv", "Severance"],
    ]);
    expect(page.totalPages).toBe(3);
  });

  it("caches repeated list calls", async () => {
    const { tmdb, fetchFn } = makeTmdb(() => jsonResponse({ results: [movieResult] }));
    await tmdb.list("popular-movies");
    await tmdb.list("popular-movies");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("returns an empty page for a blank search without calling TMDB", async () => {
    const { tmdb, fetchFn } = makeTmdb(() => jsonResponse({}));
    expect(await tmdb.search("   ")).toEqual({ page: 1, totalPages: 0, items: [] });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("searches across movies and shows", async () => {
    const { tmdb, fetchFn } = makeTmdb(() => jsonResponse({ results: [{ ...movieResult, media_type: "movie" }] }));
    const page = await tmdb.search(" heat ");
    expect(page.items).toHaveLength(1);
    const url = fetchFn.mock.calls[0]![0] as URL;
    expect(url.pathname).toBe("/3/search/multi");
    expect(url.searchParams.get("query")).toBe("heat");
  });

  it("maps the newest-first sort for tv and applies a vote floor to top rated", async () => {
    const { tmdb, fetchFn } = makeTmdb(() => jsonResponse({ results: [tvResult] }));
    await tmdb.discover("tv", { sort: "primary_release_date.desc", genre: 18 });
    await tmdb.discover("movie", { sort: "vote_average.desc" });
    const tvUrl = fetchFn.mock.calls[0]![0] as URL;
    const movieUrl = fetchFn.mock.calls[1]![0] as URL;
    expect(tvUrl.searchParams.get("sort_by")).toBe("first_air_date.desc");
    expect(tvUrl.searchParams.get("with_genres")).toBe("18");
    expect(movieUrl.searchParams.get("vote_count.gte")).toBe("300");
  });

  it("builds the top rated lists from discover with a vote floor", async () => {
    const { tmdb, fetchFn } = makeTmdb(() => jsonResponse({ results: [movieResult] }));
    await tmdb.list("top-rated-movies");
    await tmdb.list("top-rated-shows");
    const movieUrl = fetchFn.mock.calls[0]![0] as URL;
    const tvUrl = fetchFn.mock.calls[1]![0] as URL;
    expect(movieUrl.pathname).toBe("/3/discover/movie");
    expect(movieUrl.searchParams.get("sort_by")).toBe("vote_average.desc");
    expect(movieUrl.searchParams.get("vote_count.gte")).toBe("5000");
    expect(movieUrl.searchParams.get("region")).toBe("US");
    expect(tvUrl.pathname).toBe("/3/discover/tv");
    expect(tvUrl.searchParams.get("vote_count.gte")).toBe("2000");
  });

  it("throws a 404 TmdbError for unknown titles", async () => {
    const { tmdb } = makeTmdb(() => jsonResponse({}, 404));
    await expect(tmdb.details("movie", 999)).rejects.toMatchObject({ name: "TmdbError", status: 404 });
  });

  it("reports a bad key as a 502 without leaking the key", async () => {
    const { tmdb } = makeTmdb(() => jsonResponse({}, 401), "secret-key");
    const error = await tmdb.list("trending").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TmdbError);
    expect((error as TmdbError).status).toBe(502);
    expect((error as TmdbError).message).not.toContain("secret-key");
  });

  it("builds the home page with a hero list limited to titles that have art and a blurb", async () => {
    const { tmdb } = makeTmdb((url) => {
      if (url.pathname === "/3/trending/all/week") {
        return jsonResponse({
          results: [
            { ...movieResult, media_type: "movie" },
            { ...tvResult, media_type: "tv", backdrop_path: "/x.jpg" },
            { ...movieResult, id: 5, media_type: "movie", backdrop_path: null },
          ],
        });
      }
      return url.pathname === "/3/movie/upcoming" ? jsonResponse({ results: [] }) : jsonResponse({ results: [movieResult] });
    });
    const home = await tmdb.home();
    expect(home.hero.map((t) => t.id)).toEqual([1, 2]);
    expect(home.rows.map((r) => r.id)).not.toContain("upcoming");
    expect(home.rows.map((r) => r.id)).toContain("trending");
  });
});

describe("toDetails", () => {
  const rawMovie = {
    ...movieResult,
    genre_ids: undefined,
    tagline: "A cop and a thief.",
    runtime: 170,
    status: "Released",
    genres: [{ id: 28, name: "Action" }],
    credits: {
      cast: Array.from({ length: 20 }, (_, i) => ({ id: i, name: `Actor ${i}`, character: `Role ${i}`, profile_path: null })),
      crew: [
        { job: "Director", name: "Michael Mann" },
        { job: "Producer", name: "Someone Else" },
      ],
    },
    videos: {
      results: [
        { site: "YouTube", key: "teaser1", type: "Teaser", official: true, name: "Teaser" },
        { site: "YouTube", key: "trailer-unofficial", type: "Trailer", official: false, name: "Fan cut" },
        { site: "YouTube", key: "trailer-official", type: "Trailer", official: true, name: "Official Trailer" },
        { site: "Vimeo", key: "vimeo1", type: "Trailer", official: true, name: "Vimeo" },
      ],
    },
    "watch/providers": {
      results: {
        US: {
          link: "https://www.themoviedb.org/movie/1/watch?locale=US",
          free: [{ provider_id: 73, provider_name: "Tubi", logo_path: "/tubi.jpg" }],
          ads: [{ provider_id: 300, provider_name: "Pluto TV", logo_path: null }],
          flatrate: [{ provider_id: 8, provider_name: "Netflix", logo_path: "/n.jpg" }],
          rent: [{ provider_id: 2, provider_name: "Obscure Rentals", logo_path: null }],
        },
      },
    },
    similar: { results: [{ ...movieResult, id: 77, title: "Collateral" }] },
    release_dates: {
      results: [
        { iso_3166_1: "GB", release_dates: [{ certification: "15" }] },
        { iso_3166_1: "US", release_dates: [{ certification: "" }, { certification: "R" }] },
      ],
    },
  };

  it("builds full movie details", () => {
    const d = toDetails(rawMovie, "movie", "US");
    expect(d).toMatchObject({
      id: 1,
      title: "Heat",
      tagline: "A cop and a thief.",
      runtime: 170,
      certification: "R",
      directors: ["Michael Mann"],
      genreIds: [28],
      seasons: null,
    });
    expect(d.cast).toHaveLength(15);
    expect(d.similar.map((s) => s.title)).toEqual(["Collateral"]);
  });

  it("prefers the official YouTube trailer over teasers, fan cuts and other sites", () => {
    expect(toDetails(rawMovie, "movie", "US").trailer).toEqual({ key: "trailer-official", name: "Official Trailer" });
  });

  it("has no trailer when there are no videos", () => {
    expect(toDetails({ ...rawMovie, videos: undefined }, "movie", "US").trailer).toBeNull();
  });

  it("splits availability into free, ad-supported, subscription and rent, with search links where known", () => {
    const a = toDetails(rawMovie, "movie", "US").availability;
    expect(a.link).toContain("themoviedb.org");
    expect(a.free[0]).toMatchObject({ name: "Tubi", url: "https://tubitv.com/search/Heat" });
    expect(a.ads[0]?.name).toBe("Pluto TV");
    expect(a.subscription[0]?.name).toBe("Netflix");
    expect(a.rent[0]).toMatchObject({ name: "Obscure Rentals", url: null });
    expect(a.buy).toEqual([]);
  });

  it("returns empty availability for a region with no data", () => {
    const a = toDetails(rawMovie, "movie", "DE").availability;
    expect(a).toEqual({ link: null, free: [], ads: [], subscription: [], rent: [], buy: [] });
  });

  it("builds tv details with creators, seasons, episode length and tv rating", () => {
    const d = toDetails(
      {
        ...tvResult,
        number_of_seasons: 2,
        episode_run_time: [50],
        created_by: [{ name: "Dan Erickson" }],
        content_ratings: { results: [{ iso_3166_1: "US", rating: "TV-MA" }] },
      },
      "tv",
      "US",
    );
    expect(d).toMatchObject({ mediaType: "tv", seasons: 2, runtime: 50, directors: ["Dan Erickson"], certification: "TV-MA" });
  });

  it("uses null for a zero or missing runtime", () => {
    expect(toDetails({ ...rawMovie, runtime: 0 }, "movie", "US").runtime).toBeNull();
  });
});
