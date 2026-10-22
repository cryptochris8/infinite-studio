import type { Availability, Provider } from "./types.ts";

export interface WatchOption extends Provider {
  /** True when the service shows ads (free with ads) rather than being fully free. */
  withAds?: boolean;
}

export interface WatchGroups {
  /** Free to watch: no-cost services plus ad-supported ones. */
  free: WatchOption[];
  subscription: Provider[];
  /** Rent or buy, each service listed once. */
  paid: Provider[];
  /** Page listing every service for this title. */
  link: string | null;
}

function uniqueById<T extends Provider>(list: T[]): T[] {
  const seen = new Set<number>();
  return list.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

/** Turns TMDB's provider buckets into the three groups people care about, free first. */
export function groupAvailability(a: Availability): WatchGroups {
  const free = uniqueById<WatchOption>([...a.free, ...a.ads.map((p) => ({ ...p, withAds: true }))]);
  const freeIds = new Set(free.map((p) => p.id));
  return {
    free,
    // Don't repeat a service under "subscription" if it already appears as free.
    subscription: uniqueById(a.subscription).filter((p) => !freeIds.has(p.id)),
    paid: uniqueById([...a.rent, ...a.buy]).filter((p) => !freeIds.has(p.id)),
    link: a.link,
  };
}
