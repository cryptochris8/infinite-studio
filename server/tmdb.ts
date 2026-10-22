import type {
  Availability,
  CastMember,
  Genre,
  HomeData,
  MediaType,
  Page,
  Provider,
  Title,
  TitleDetails,
  Trailer,
} from "../shared/types.ts";
import { TtlCache } from "./cache.ts";
import { providerSearchUrl } from "./providers.ts";

const BASE_URL = "https://api.themoviedb.org/3";

const MINUTE = 60_000;
const TTL = { lists: 30 * MINUTE, details: 6 * 60 * MINUTE, genres: 24 * 60 * MINUTE, search: 10 * MINUTE };

export class TmdbError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "TmdbError";
  }
}

export interface TmdbOptions {
  apiKey: string;
  region?: string;
  language?: string;
  fetchFn?: typeof fetch;
  cache?: TtlCache;
}

type Json = Record<string, any>;

export const SORTS = ["popularity.desc", "vote_average.desc", "primary_release_date.desc"] as const;
export type Sort = (typeof SORTS)[number];

export interface DiscoverOptions {
  genre?: number;
  sort?: Sort;
  page?: number;
}

export type ListKind =
  | "trending"
  | "now-playing"
  | "upcoming"
  | "popular-movies"
  | "top-rated-movies"
  | "popular-shows"
  | "top-rated-shows";

interface ListDef {
  path: string;
  type: MediaType | "all";
  regional?: boolean;
  params?: Record<string, string | number>;
}

const LISTS: Record<ListKind, ListDef> = {
  trending: { path: "/trending/all/week", type: "all" },
  "now-playing": { path: "/movie/now_playing", type: "movie", regional: true },
  upcoming: { path: "/movie/upcoming", type: "movie", regional: true },
  "popular-movies": { path: "/movie/popular", type: "movie", regional: true },
  // TMDB's own /top_rated lists now surface brand-new titles with a handful of votes, so
  // "top rated" is built from discover with a vote floor high enough to keep it to the classics.
  "top-rated-movies": {
    path: "/discover/movie",
    type: "movie",
    regional: true,
    params: { sort_by: "vote_average.desc", "vote_count.gte": 5000 },
  },
  "popular-shows": { path: "/tv/popular", type: "tv" },
  "top-rated-shows": {
    path: "/discover/tv",
    type: "tv",
    params: { sort_by: "vote_average.desc", "vote_count.gte": 2000 },
  },
};

export const LIST_KINDS = Object.keys(LISTS) as ListKind[];

function yearOf(date: unknown): number | null {
  if (typeof date !== "string" || date.length < 4) return null;
  const year = Number.parseInt(date.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

/** Converts a raw TMDB movie/tv/search result into a Title. Returns null for people and junk. */
export function toTitle(raw: Json, fallbackType?: MediaType): Title | null {
  const mediaType = (raw.media_type ?? fallbackType) as string | undefined;
  if (mediaType !== "movie" && mediaType !== "tv") return null;
  if (typeof raw.id !== "number") return null;
  const isMovie = mediaType === "movie";
  return {
    id: raw.id,
    mediaType,
    title: String((isMovie ? raw.title : raw.name) ?? ""),
    overview: String(raw.overview ?? ""),
    posterPath: raw.poster_path ?? null,
    backdropPath: raw.backdrop_path ?? null,
    year: yearOf(isMovie ? raw.release_date : raw.first_air_date),
    rating: Math.round(Number(raw.vote_average ?? 0) * 10) / 10,
    voteCount: Number(raw.vote_count ?? 0),
    genreIds: Array.isArray(raw.genre_ids) ? raw.genre_ids : [],
  };
}

function toTitles(results: unknown, fallbackType?: MediaType): Title[] {
  if (!Array.isArray(results)) return [];
  return results.flatMap((r) => {
    const t = toTitle(r, fallbackType);
    return t && t.title ? [t] : [];
  });
}

function pickTrailer(videos: Json | undefined): Trailer | null {
  const list: Json[] = Array.isArray(videos?.results) ? videos.results : [];
  const youtube = list.filter((v) => v.site === "YouTube" && typeof v.key === "string");
  const rank = (v: Json) =>
    (v.type === "Trailer" ? 0 : v.type === "Teaser" ? 2 : 4) + (v.official ? 0 : 1);
  const best = [...youtube]
    .filter((v) => v.type === "Trailer" || v.type === "Teaser")
    .sort((a, b) => rank(a) - rank(b))[0];
  return best ? { key: best.key, name: String(best.name ?? "Trailer") } : null;
}

function pickCertification(raw: Json, type: MediaType, region: string): string | null {
  if (type === "movie") {
    const entry = (raw.release_dates?.results ?? []).find((r: Json) => r.iso_3166_1 === region);
    const dates: Json[] = entry?.release_dates ?? [];
    return dates.find((d) => d.certification)?.certification ?? null;
  }
  const entry = (raw.content_ratings?.results ?? []).find((r: Json) => r.iso_3166_1 === region);
  return entry?.rating || null;
}

function toProviders(list: unknown, titleName: string): Provider[] {
  if (!Array.isArray(list)) return [];
  return list.map((p: Json) => ({
    id: p.provider_id,
    name: String(p.provider_name ?? ""),
    logoPath: p.logo_path ?? null,
    url: providerSearchUrl(String(p.provider_name ?? ""), titleName),
  }));
}

function toAvailability(raw: Json, region: string, titleName: string): Availability {
  const r: Json = raw["watch/providers"]?.results?.[region] ?? {};
  return {
    link: r.link ?? null,
    free: toProviders(r.free, titleName),
    ads: toProviders(r.ads, titleName),
    subscription: toProviders(r.flatrate, titleName),
    rent: toProviders(r.rent, titleName),
    buy: toProviders(r.buy, titleName),
  };
}

function toCast(credits: Json | undefined): CastMember[] {
  const cast: Json[] = Array.isArray(credits?.cast) ? credits.cast : [];
  return cast.slice(0, 15).map((c) => ({
    id: c.id,
    name: String(c.name ?? ""),
    character: String(c.character ?? ""),
    profilePath: c.profile_path ?? null,
  }));
}

export function toDetails(raw: Json, type: MediaType, region: string): TitleDetails {
  const base = toTitle(raw, type);
  if (!base) throw new TmdbError("Unexpected TMDB response", 502);
  const isMovie = type === "movie";
  const crew: Json[] = Array.isArray(raw.credits?.crew) ? raw.credits.crew : [];
  const directors = isMovie
    ? crew.filter((c) => c.job === "Director").map((c) => String(c.name))
    : (raw.created_by ?? []).map((c: Json) => String(c.name));
  const runtime = isMovie ? raw.runtime : raw.episode_run_time?.[0];

  return {
    ...base,
    genreIds: (raw.genres ?? []).map((g: Json) => g.id),
    tagline: String(raw.tagline ?? ""),
    runtime: typeof runtime === "number" && runtime > 0 ? runtime : null,
    genres: (raw.genres ?? []).map((g: Json) => ({ id: g.id, name: String(g.name) })),
    certification: pickCertification(raw, type, region),
    status: String(raw.status ?? ""),
    seasons: isMovie ? null : (raw.number_of_seasons ?? null),
    directors,
    cast: toCast(raw.credits),
    trailer: pickTrailer(raw.videos),
    availability: toAvailability(raw, region, base.title),
    similar: toTitles(raw.similar?.results, type).slice(0, 12),
  };
}

export class Tmdb {
  private readonly apiKey: string;
  private readonly region: string;
  private readonly language: string;
  private readonly fetchFn: typeof fetch;
  private readonly cache: TtlCache;

  constructor(options: TmdbOptions) {
    this.apiKey = options.apiKey;
    this.region = options.region ?? "US";
    this.language = options.language ?? "en-US";
    this.fetchFn = options.fetchFn ?? fetch;
    this.cache = options.cache ?? new TtlCache();
  }

  private async request(path: string, params: Record<string, string | number | undefined> = {}): Promise<Json> {
    const url = new URL(BASE_URL + path);
    url.searchParams.set("language", this.language);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
    // A v4 read token is a JWT and goes in the header; a v3 key goes in the query.
    const headers: Record<string, string> = { accept: "application/json" };
    if (this.apiKey.startsWith("eyJ")) headers.authorization = `Bearer ${this.apiKey}`;
    else url.searchParams.set("api_key", this.apiKey);

    const res = await this.fetchFn(url, { headers });
    if (res.status === 404) throw new TmdbError("Not found", 404);
    if (res.status === 401) throw new TmdbError("TMDB rejected the API key", 502);
    if (!res.ok) throw new TmdbError(`TMDB request failed (${res.status})`, 502);
    return (await res.json()) as Json;
  }

  /** Cache key deliberately excludes the API key so it never lands in a key string. */
  private cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
    return this.cache.get(`${this.region}:${this.language}:${key}`, ttl, load);
  }

  list(kind: ListKind, page = 1): Promise<Page<Title>> {
    const def = LISTS[kind];
    return this.cached(`list:${kind}:${page}`, TTL.lists, async () => {
      const raw = await this.request(def.path, {
        ...def.params,
        page,
        region: def.regional ? this.region : undefined,
      });
      return {
        page: raw.page ?? page,
        totalPages: Math.min(raw.total_pages ?? 1, 500),
        items: toTitles(raw.results, def.type === "all" ? undefined : def.type),
      };
    });
  }

  discover(type: MediaType, options: DiscoverOptions = {}): Promise<Page<Title>> {
    const { genre, sort = "popularity.desc", page = 1 } = options;
    return this.cached(`discover:${type}:${genre ?? ""}:${sort}:${page}`, TTL.lists, async () => {
      // TV has no primary_release_date; map the "newest" sort to first_air_date.
      const sortBy = type === "tv" ? sort.replace("primary_release_date", "first_air_date") : sort;
      const raw = await this.request(`/discover/${type}`, {
        with_genres: genre,
        sort_by: sortBy,
        page,
        // Skip near-empty entries so "highest rated" isn't a list of one-vote titles.
        "vote_count.gte": sortBy.startsWith("vote_average") ? 300 : undefined,
        region: this.region,
      });
      return {
        page: raw.page ?? page,
        totalPages: Math.min(raw.total_pages ?? 1, 500),
        items: toTitles(raw.results, type),
      };
    });
  }

  search(query: string, page = 1): Promise<Page<Title>> {
    const q = query.trim();
    if (!q) return Promise.resolve({ page: 1, totalPages: 0, items: [] });
    return this.cached(`search:${q.toLowerCase()}:${page}`, TTL.search, async () => {
      const raw = await this.request("/search/multi", { query: q, page, include_adult: "false" });
      return {
        page: raw.page ?? page,
        totalPages: Math.min(raw.total_pages ?? 1, 500),
        items: toTitles(raw.results),
      };
    });
  }

  genres(type: MediaType): Promise<Genre[]> {
    return this.cached(`genres:${type}`, TTL.genres, async () => {
      const raw = await this.request(`/genre/${type}/list`);
      return (raw.genres ?? []).map((g: Json) => ({ id: g.id, name: String(g.name) }));
    });
  }

  details(type: MediaType, id: number): Promise<TitleDetails> {
    const append =
      type === "movie"
        ? "credits,videos,watch/providers,similar,release_dates"
        : "credits,videos,watch/providers,similar,content_ratings";
    return this.cached(`details:${type}:${id}`, TTL.details, async () => {
      const raw = await this.request(`/${type}/${id}`, {
        append_to_response: append,
        include_video_language: "en,null",
      });
      return toDetails(raw, type, this.region);
    });
  }

  async home(): Promise<HomeData> {
    const [trending, nowPlaying, upcoming, popularMovies, topMovies, popularShows, topShows] = await Promise.all([
      this.list("trending"),
      this.list("now-playing"),
      this.list("upcoming"),
      this.list("popular-movies"),
      this.list("top-rated-movies"),
      this.list("popular-shows"),
      this.list("top-rated-shows"),
    ]);

    const rows = [
      { id: "trending", title: "Trending This Week", items: trending.items },
      { id: "now-playing", title: "In Theaters Now", items: nowPlaying.items },
      { id: "upcoming", title: "Coming Soon", items: upcoming.items },
      { id: "popular-movies", title: "Popular Movies", items: popularMovies.items },
      { id: "top-rated-movies", title: "Top Rated Movies", items: topMovies.items },
      { id: "popular-shows", title: "Popular Shows", items: popularShows.items },
      { id: "top-rated-shows", title: "Top Rated Shows", items: topShows.items },
    ].filter((r) => r.items.length > 0);

    // Hero banners need a wide backdrop and a blurb to look good.
    const hero = trending.items.filter((t) => t.backdropPath && t.overview).slice(0, 6);
    return { hero, rows };
  }
}
