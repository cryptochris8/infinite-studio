/**
 * Best-effort "open this title on that service" links. TMDB only supplies one
 * JustWatch page per title, not per-service deep links, so for services we know
 * we build a search URL on the service's own site. These URL formats are not
 * guaranteed by the services and may need updating; the JustWatch link is the
 * reliable fallback.
 */
const SEARCH_URLS: Record<string, (q: string) => string> = {
  tubi: (q) => `https://tubitv.com/search/${q}`,
  "pluto tv": (q) => `https://pluto.tv/en/search/details?query=${q}`,
  "the roku channel": (q) => `https://therokuchannel.roku.com/search/${q}`,
  "roku channel": (q) => `https://therokuchannel.roku.com/search/${q}`,
  "plex": (q) => `https://watch.plex.tv/search?q=${q}`,
  "youtube": (q) => `https://www.youtube.com/results?search_query=${q}`,
  "kanopy": (q) => `https://www.kanopy.com/en/search?query=${q}`,
  "hoopla": (q) => `https://www.hoopladigital.com/search?q=${q}`,
  "freevee": (q) => `https://www.amazon.com/s?k=${q}&i=instant-video`,
  "amazon prime video": (q) => `https://www.amazon.com/s?k=${q}&i=instant-video`,
  "netflix": (q) => `https://www.netflix.com/search?q=${q}`,
  "max": (q) => `https://play.max.com/search?q=${q}`,
  "disney plus": (q) => `https://www.disneyplus.com/search?q=${q}`,
  "hulu": (q) => `https://www.hulu.com/search?q=${q}`,
  "apple tv": (q) => `https://tv.apple.com/search?term=${q}`,
  "apple tv plus": (q) => `https://tv.apple.com/search?term=${q}`,
};

/** Returns a search link for a known service, or null for unknown ones. */
export function providerSearchUrl(providerName: string, titleName: string): string | null {
  const build = SEARCH_URLS[providerName.trim().toLowerCase()];
  return build ? build(encodeURIComponent(titleName)) : null;
}
