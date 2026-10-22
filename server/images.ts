import { IMAGE_SIZES, type ImageSize } from "./roku.ts";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const FILE_PATTERN = /^[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|svg)$/;
const WEEK_SECONDS = 7 * 24 * 60 * 60;

export class ImageError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 502,
  ) {
    super(message);
    this.name = "ImageError";
  }
}

/**
 * Fetches a TMDB image so the Roku can load it over plain HTTP from the Pi. Only TMDB's own file
 * names and a few sizes are accepted, so this can't be pointed at anything else.
 */
export async function fetchTmdbImage(size: string, file: string, fetchFn: typeof fetch = fetch): Promise<Response> {
  if (!IMAGE_SIZES.includes(size as ImageSize) || !FILE_PATTERN.test(file)) {
    throw new ImageError("Bad image path", 400);
  }
  let upstream: Response;
  try {
    upstream = await fetchFn(`${TMDB_IMAGE_BASE}/${size}/${file}`);
  } catch {
    throw new ImageError("Couldn't load the image", 502);
  }
  if (upstream.status === 404) throw new ImageError("No such image", 404);
  if (!upstream.ok || !upstream.body) throw new ImageError("Couldn't load the image", 502);

  return new Response(upstream.body, {
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
      // TMDB never changes the picture behind a file name, so it can be cached for a long time.
      "cache-control": `public, max-age=${WEEK_SECONDS}, immutable`,
    },
  });
}
