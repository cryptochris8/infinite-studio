import type { Genre, HomeData, MediaType, Page, Title, TitleDetails } from "@shared/types.ts";

export interface Profile {
  id: number;
  name: string;
}

export type Sort = "popularity.desc" | "vote_average.desc" | "primary_release_date.desc";

export type ListKind =
  | "trending"
  | "now-playing"
  | "upcoming"
  | "popular-movies"
  | "top-rated-movies"
  | "popular-shows"
  | "top-rated-shows";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: init.body ? { "content-type": "application/json", ...init.headers } : init.headers,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError("Can't reach the multistream server. Is the Pi on?", 0);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(body?.error ?? `Request failed (${res.status})`, res.status);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const api = {
  home: (signal?: AbortSignal) => request<HomeData>("/home", { signal }),

  list: (kind: ListKind, page = 1, signal?: AbortSignal) =>
    request<Page<Title>>(`/lists/${kind}${query({ page })}`, { signal }),

  browse: (type: MediaType, options: { genre?: number; sort?: Sort; page?: number } = {}, signal?: AbortSignal) =>
    request<Page<Title>>(`/browse/${type}${query(options)}`, { signal }),

  search: (q: string, page = 1, signal?: AbortSignal) =>
    request<Page<Title>>(`/search${query({ q, page })}`, { signal }),

  genres: (type: MediaType, signal?: AbortSignal) => request<Genre[]>(`/genres/${type}`, { signal }),

  title: (type: MediaType, id: number, signal?: AbortSignal) =>
    request<TitleDetails>(`/title/${type}/${id}`, { signal }),

  profiles: () => request<Profile[]>("/profiles"),
  createProfile: (name: string) => request<Profile>("/profiles", { method: "POST", body: JSON.stringify({ name }) }),
  deleteProfile: (id: number) => request<void>(`/profiles/${id}`, { method: "DELETE" }),

  watchlist: (profileId: number) => request<Title[]>(`/profiles/${profileId}/watchlist`),
  addToWatchlist: (profileId: number, type: MediaType, id: number) =>
    request<void>(`/profiles/${profileId}/watchlist/${type}/${id}`, { method: "PUT" }),
  removeFromWatchlist: (profileId: number, type: MediaType, id: number) =>
    request<void>(`/profiles/${profileId}/watchlist/${type}/${id}`, { method: "DELETE" }),
};
