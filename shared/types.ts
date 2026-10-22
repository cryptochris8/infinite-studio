export type MediaType = "movie" | "tv";

/** A poster-card sized title, as shown in rows and grids. */
export interface Title {
  id: number;
  mediaType: MediaType;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  /** Release year (movie) or first-air year (tv); null when unknown. */
  year: number | null;
  /** 0-10 TMDB average; 0 when unrated. */
  rating: number;
  voteCount: number;
  genreIds: number[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export interface Trailer {
  /** YouTube video id. */
  key: string;
  name: string;
}

export interface Provider {
  id: number;
  name: string;
  logoPath: string | null;
  /** Best-effort link that opens this service's search for the title. */
  url: string | null;
}

export interface Availability {
  /** JustWatch page for the title in the chosen region; lists every service. */
  link: string | null;
  free: Provider[];
  ads: Provider[];
  subscription: Provider[];
  rent: Provider[];
  buy: Provider[];
}

export interface TitleDetails extends Title {
  tagline: string;
  /** Minutes (movie) or typical episode length (tv); null when unknown. */
  runtime: number | null;
  genres: Genre[];
  /** Age rating such as "PG-13" or "TV-MA"; null when unknown. */
  certification: string | null;
  status: string;
  seasons: number | null;
  directors: string[];
  cast: CastMember[];
  trailer: Trailer | null;
  availability: Availability;
  similar: Title[];
}

export interface Row {
  id: string;
  title: string;
  items: Title[];
}

export interface HomeData {
  hero: Title[];
  rows: Row[];
}

export interface Page<T> {
  page: number;
  totalPages: number;
  items: T[];
}
