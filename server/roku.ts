import type { Genre, MediaType, Provider, Row, Title, TitleDetails } from "../shared/types.ts";
import { groupAvailability } from "../shared/availability.ts";
import { formatRating, formatRuntime, typeLabel, yearLabel } from "../shared/format.ts";

/**
 * Data shaped for the Roku app. BrightScript is awkward to test off the device, so the Pi does
 * the formatting and the Roku app only lays the fields out.
 */

export interface RokuItem {
  /** "movie:550", unique across movies and shows. */
  id: string;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  description: string;
  /** Absolute image URLs through the Pi's image proxy; "" when TMDB has no image. */
  posterUrl: string;
  backdropUrl: string;
  /** "Movie · 1999 · ★ 8.4" */
  meta: string;
}

export interface RokuRow {
  title: string;
  items: RokuItem[];
}

export interface RokuWatchOption {
  /** Button text, e.g. "Free on Tubi" or "Rent or buy on Prime Video". */
  label: string;
  /** Roku channel ID of the app to open. */
  channelId: string;
  /** App name for messages such as "Opening Tubi". */
  app: string;
}

export interface RokuDetails extends RokuItem {
  tagline: string;
  /** "R · Movie · 1999 · 2h 19m" */
  metaLine: string;
  /** "★ 8.4", or "" when there are too few votes. */
  ratingLine: string;
  genresLine: string;
  /** "Directed by David Fincher" or "Created by …"; "" when unknown. */
  creditsLine: string;
  /** "Starring Brad Pitt, Edward Norton, Helena Bonham Carter"; "" when unknown. */
  castLine: string;
  /** YouTube video id of the trailer; "" when there is none. */
  trailerKey: string;
  watch: RokuWatchOption[];
  /** Services that have the title but no Roku app we can open, or why there is nothing to watch. */
  watchNote: string;
  similar: RokuItem[];
  saved: boolean;
}

/** TMDB image sizes the proxy will fetch. Kept short so it can't be used to fetch anything else. */
export const IMAGE_SIZES = ["w185", "w342", "w780", "w1280"] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];

/** Image URL through the Pi, or "" when there is no image. `base` is the Pi's own origin. */
export function proxiedImageUrl(base: string, size: ImageSize, path: string | null): string {
  return path ? `${base}/img/${size}${path}` : "";
}

/**
 * Roku channel IDs for the services TMDB lists. They aren't published by Roku in one place; these
 * come from device app listings and should be checked against /query/apps on the TV. The first
 * matching entry wins, so the "… Amazon Channel" style add-ons are matched before the services
 * they resell.
 */
const ROKU_CHANNELS: { match: RegExp; channelId: string; app: string }[] = [
  { match: /amazon channel$/, channelId: "13", app: "Prime Video" },
  { match: /apple tv channel$/, channelId: "551012", app: "Apple TV" },
  { match: /roku premium channel$/, channelId: "151908", app: "The Roku Channel" },
  { match: /^netflix/, channelId: "12", app: "Netflix" },
  { match: /^hulu/, channelId: "2285", app: "Hulu" },
  { match: /^disney/, channelId: "291097", app: "Disney+" },
  { match: /^(hbo )?max\b/, channelId: "61322", app: "HBO Max" },
  { match: /^paramount/, channelId: "31440", app: "Paramount+" },
  { match: /^(amazon (prime )?video|freevee)/, channelId: "13", app: "Prime Video" },
  { match: /^peacock/, channelId: "593099", app: "Peacock" },
  { match: /^apple tv/, channelId: "551012", app: "Apple TV" },
  { match: /^(the )?roku channel/, channelId: "151908", app: "The Roku Channel" },
  { match: /^tubi/, channelId: "41468", app: "Tubi" },
  { match: /^pluto/, channelId: "74519", app: "Pluto TV" },
  { match: /^plex/, channelId: "13535", app: "Plex" },
  { match: /^kanopy/, channelId: "122409", app: "Kanopy" },
  { match: /^(fandango at home|vudu)/, channelId: "13842", app: "Fandango at Home" },
  { match: /^youtube( premium| free)?$/, channelId: "837", app: "YouTube" },
];

export const YOUTUBE_CHANNEL_ID = "837";

/** The Roku app for a TMDB provider name, or null when we don't know one. */
export function rokuChannelFor(providerName: string): { channelId: string; app: string } | null {
  const name = providerName.trim().toLowerCase();
  const hit = ROKU_CHANNELS.find((c) => c.match.test(name));
  return hit ? { channelId: hit.channelId, app: hit.app } : null;
}

const MAX_WATCH_BUTTONS = 6;

/** Buttons for opening each service on the Roku, free first, each Roku app once. */
export function rokuWatchOptions(details: TitleDetails): { watch: RokuWatchOption[]; watchNote: string } {
  const groups = groupAvailability(details.availability);
  const candidates: { provider: Provider; label: (app: string) => string }[] = [
    ...groups.free.map((p) => ({
      provider: p as Provider,
      label: (app: string) => (p.withAds ? `Free with ads on ${app}` : `Free on ${app}`),
    })),
    ...groups.subscription.map((p) => ({ provider: p, label: (app: string) => `Watch on ${app}` })),
    ...groups.paid.map((p) => ({ provider: p, label: (app: string) => `Rent or buy on ${app}` })),
  ];

  const watch: RokuWatchOption[] = [];
  const seenChannels = new Set<string>();
  const unmatched: string[] = [];
  for (const { provider, label } of candidates) {
    const channel = rokuChannelFor(provider.name);
    if (!channel) {
      if (!unmatched.includes(provider.name)) unmatched.push(provider.name);
      continue;
    }
    if (seenChannels.has(channel.channelId) || watch.length >= MAX_WATCH_BUTTONS) continue;
    seenChannels.add(channel.channelId);
    watch.push({ label: label(channel.app), channelId: channel.channelId, app: channel.app });
  }

  let watchNote = "";
  if (unmatched.length > 0) watchNote = `Also on ${unmatched.slice(0, 4).join(", ")}`;
  else if (watch.length === 0) watchNote = "Not streaming anywhere right now";
  return { watch, watchNote };
}

function joinParts(parts: (string | null | undefined)[]): string {
  return parts.filter((p): p is string => Boolean(p)).join(" · ");
}

export function rokuItem(title: Title, base: string): RokuItem {
  const rating = formatRating(title);
  return {
    id: `${title.mediaType}:${title.id}`,
    tmdbId: title.id,
    mediaType: title.mediaType,
    title: title.title,
    description: title.overview,
    posterUrl: proxiedImageUrl(base, "w342", title.posterPath),
    backdropUrl: proxiedImageUrl(base, "w1280", title.backdropPath),
    meta: joinParts([typeLabel(title), yearLabel(title), rating && `★ ${rating}`]),
  };
}

export function rokuRows(rows: Pick<Row, "title" | "items">[], base: string): RokuRow[] {
  return rows
    .filter((r) => r.items.length > 0)
    .map((r) => ({ title: r.title, items: r.items.map((t) => rokuItem(t, base)) }));
}

function seasonsLabel(seasons: number | null): string {
  if (!seasons) return "";
  return seasons === 1 ? "1 Season" : `${seasons} Seasons`;
}

export function rokuDetails(details: TitleDetails, base: string, saved: boolean): RokuDetails {
  const rating = formatRating(details);
  const credits = details.directors.slice(0, 3).join(", ");
  const cast = details.cast
    .slice(0, 5)
    .map((c) => c.name)
    .join(", ");
  return {
    ...rokuItem(details, base),
    // The detail screen shows the poster bigger than a row does.
    posterUrl: proxiedImageUrl(base, "w780", details.posterPath),
    tagline: details.tagline,
    metaLine: joinParts([
      details.certification,
      typeLabel(details),
      yearLabel(details),
      formatRuntime(details.runtime),
      seasonsLabel(details.seasons),
    ]),
    ratingLine: rating ? `★ ${rating}` : "",
    genresLine: details.genres.map((g) => g.name).join(", "),
    creditsLine: credits ? `${details.mediaType === "movie" ? "Directed by" : "Created by"} ${credits}` : "",
    castLine: cast ? `Starring ${cast}` : "",
    trailerKey: details.trailer?.key ?? "",
    ...rokuWatchOptions(details),
    similar: details.similar.map((t) => rokuItem(t, base)),
    saved,
  };
}

/** Genre rows for the Roku's Movies and Shows screens, after a Popular row. */
export const BROWSE_GENRES: Record<MediaType, Genre[]> = {
  movie: [
    { id: 28, name: "Action" },
    { id: 35, name: "Comedy" },
    { id: 18, name: "Drama" },
    { id: 53, name: "Thriller" },
    { id: 878, name: "Science Fiction" },
    { id: 27, name: "Horror" },
    { id: 10749, name: "Romance" },
    { id: 16, name: "Animation" },
    { id: 10751, name: "Family" },
    { id: 99, name: "Documentary" },
  ],
  tv: [
    { id: 10759, name: "Action & Adventure" },
    { id: 35, name: "Comedy" },
    { id: 18, name: "Drama" },
    { id: 80, name: "Crime" },
    { id: 10765, name: "Sci-Fi & Fantasy" },
    { id: 9648, name: "Mystery" },
    { id: 16, name: "Animation" },
    { id: 10762, name: "Kids" },
    { id: 10764, name: "Reality" },
    { id: 99, name: "Documentary" },
  ],
};

const ECP_PORT = 8060;
const ECP_TIMEOUT_MS = 5000;

/** True for a private IPv4 address (10/8, 172.16/12, 192.168/16): the only hosts we'll send ECP to. */
export function isPrivateIpv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const [a, b, c, d] = m.slice(1).map(Number) as [number, number, number, number];
  if ([a, b, c, d].some((n) => n > 255)) return false;
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

export class RokuLaunchError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403 | 502,
  ) {
    super(message);
    this.name = "RokuLaunchError";
  }
}

export interface LaunchRequest {
  /** The Roku's LAN IP; the Roku app sends its own. */
  host: string;
  channelId: string;
  contentId?: string;
  mediaType?: string;
}

/**
 * Asks a Roku to open an app through its External Control Protocol. Roku doesn't allow an app to
 * open another app itself, but another device on the network may ask. The TV's "Control by mobile
 * apps" setting has to allow it.
 */
export async function launchOnRoku(req: LaunchRequest, fetchFn: typeof fetch = fetch): Promise<void> {
  if (!isPrivateIpv4(req.host)) throw new RokuLaunchError("That isn't a Roku on your home network", 400);
  const url = new URL(`http://${req.host}:${ECP_PORT}/launch/${encodeURIComponent(req.channelId)}`);
  if (req.contentId) url.searchParams.set("contentId", req.contentId);
  if (req.mediaType) url.searchParams.set("mediaType", req.mediaType);

  let res: Response;
  try {
    res = await fetchFn(url, { method: "POST", signal: AbortSignal.timeout(ECP_TIMEOUT_MS) });
  } catch {
    throw new RokuLaunchError("Couldn't reach the Roku", 502);
  }
  if (res.status === 403) {
    throw new RokuLaunchError(
      "The TV blocked it. On the TV go to Settings > System > Advanced system settings > Control by mobile apps > Network access, and choose Enabled.",
      403,
    );
  }
  if (!res.ok) throw new RokuLaunchError(`The Roku said no (${res.status}). Is the app installed?`, 502);
}
