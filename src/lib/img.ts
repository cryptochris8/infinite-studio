const BASE = "https://image.tmdb.org/t/p";

export type PosterSize = "w185" | "w342" | "w500";
export type BackdropSize = "w780" | "w1280";
export type ProfileSize = "w185";
export type LogoSize = "w92";

/** Full TMDB image URL, or null when the title has no image at that slot. */
export function imageUrl(path: string | null | undefined, size: PosterSize | BackdropSize | ProfileSize | LogoSize): string | null {
  return path ? `${BASE}/${size}${path}` : null;
}

/** Comma-separated candidates for <img srcset> so phones don't download TV-sized art. */
export function posterSrcSet(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return (["w185", "w342", "w500"] as const)
    .map((s) => `${BASE}/${s}${path} ${s.slice(1)}w`)
    .join(", ");
}

export function youtubeEmbedUrl(key: string, autoplay = false): string {
  const params = new URLSearchParams({ rel: "0", modestbranding: "1", playsinline: "1" });
  if (autoplay) params.set("autoplay", "1");
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(key)}?${params}`;
}
