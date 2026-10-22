import type { Title } from "./types.ts";

/** 170 -> "2h 50m", 45 -> "45m", 120 -> "2h". Empty string when unknown. */
export function formatRuntime(minutes: number | null): string {
  if (!minutes || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "7.9", or null when the title has too few votes to mean anything. */
export function formatRating(title: Pick<Title, "rating" | "voteCount">): string | null {
  if (title.rating <= 0 || title.voteCount < 5) return null;
  return title.rating.toFixed(1);
}

export function yearLabel(title: Pick<Title, "year">): string {
  return title.year ? String(title.year) : "TBA";
}

export function typeLabel(title: Pick<Title, "mediaType">): string {
  return title.mediaType === "movie" ? "Movie" : "Series";
}

/** Route for a title's detail page. */
export function titlePath(title: Pick<Title, "mediaType" | "id">): string {
  return `/${title.mediaType}/${title.id}`;
}

/** Cuts text to roughly `max` characters on a word boundary. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
