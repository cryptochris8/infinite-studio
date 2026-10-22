import { describe, expect, it, vi } from "vitest";
import type { Provider, Title, TitleDetails } from "../shared/types.ts";
import {
  BROWSE_GENRES,
  isPrivateIpv4,
  launchOnRoku,
  proxiedImageUrl,
  rokuChannelFor,
  rokuDetails,
  rokuItem,
  rokuRows,
  rokuWatchOptions,
  RokuLaunchError,
} from "./roku.ts";

const BASE = "http://192.168.68.59:8080";

const title: Title = {
  id: 550,
  mediaType: "movie",
  title: "Fight Club",
  overview: "An insomniac office worker…",
  posterPath: "/poster.jpg",
  backdropPath: "/backdrop.jpg",
  year: 1999,
  rating: 8.4,
  voteCount: 30000,
  genreIds: [18],
};

const provider = (id: number, name: string): Provider => ({ id, name, logoPath: null, url: null });

function makeDetails(overrides: Partial<TitleDetails> = {}): TitleDetails {
  return {
    ...title,
    tagline: "Mischief. Mayhem. Soap.",
    runtime: 139,
    genres: [
      { id: 18, name: "Drama" },
      { id: 53, name: "Thriller" },
    ],
    certification: "R",
    status: "Released",
    seasons: null,
    directors: ["David Fincher"],
    cast: ["Brad Pitt", "Edward Norton", "Helena Bonham Carter", "Meat Loaf", "Jared Leto", "Zach Grenier"].map(
      (name, i) => ({ id: i, name, character: "", profilePath: null }),
    ),
    trailer: { key: "qtRKdVHc-cE", name: "Trailer" },
    availability: { link: null, free: [], ads: [], subscription: [], rent: [], buy: [] },
    similar: [{ ...title, id: 807, title: "Se7en" }],
    ...overrides,
  };
}

describe("proxiedImageUrl", () => {
  it("points at the Pi's image proxy", () => {
    expect(proxiedImageUrl(BASE, "w342", "/abc.jpg")).toBe(`${BASE}/img/w342/abc.jpg`);
  });

  it("is empty when there is no image", () => {
    expect(proxiedImageUrl(BASE, "w342", null)).toBe("");
  });
});

describe("rokuChannelFor", () => {
  it.each([
    ["Netflix", "12"],
    ["Netflix Standard with Ads", "12"],
    ["Hulu", "2285"],
    ["Disney Plus", "291097"],
    ["Max", "61322"],
    ["HBO Max", "61322"],
    ["Paramount Plus", "31440"],
    ["Paramount+ with Showtime", "31440"],
    ["Amazon Prime Video", "13"],
    ["Amazon Prime Video with Ads", "13"],
    ["Amazon Video", "13"],
    ["Peacock Premium", "593099"],
    ["Apple TV Plus", "551012"],
    ["Apple TV", "551012"],
    ["The Roku Channel", "151908"],
    ["Tubi TV", "41468"],
    ["Pluto TV", "74519"],
    ["Plex", "13535"],
    ["Kanopy", "122409"],
    ["Fandango At Home", "13842"],
    ["Vudu", "13842"],
    ["YouTube", "837"],
  ])("maps %s to channel %s", (name, channelId) => {
    expect(rokuChannelFor(name)?.channelId).toBe(channelId);
  });

  it("sends add-on channels to the app that sells them, not the original service", () => {
    expect(rokuChannelFor("Max Amazon Channel")).toEqual({ channelId: "13", app: "Prime Video" });
    expect(rokuChannelFor("Starz Apple TV Channel")).toEqual({ channelId: "551012", app: "Apple TV" });
    expect(rokuChannelFor("AMC+ Roku Premium Channel")).toEqual({ channelId: "151908", app: "The Roku Channel" });
  });

  it("ignores case and surrounding spaces", () => {
    expect(rokuChannelFor("  NETFLIX ")?.app).toBe("Netflix");
  });

  it("returns null for services without a known Roku app", () => {
    expect(rokuChannelFor("Hoopla")).toBeNull();
    expect(rokuChannelFor("YouTube TV")).toBeNull();
    expect(rokuChannelFor("")).toBeNull();
  });
});

describe("rokuWatchOptions", () => {
  it("lists free, then subscription, then rent or buy, each app once", () => {
    const details = makeDetails({
      availability: {
        link: null,
        free: [provider(73, "Tubi TV")],
        ads: [provider(300, "Pluto TV")],
        subscription: [provider(8, "Netflix"), provider(1796, "Netflix Standard with Ads")],
        rent: [provider(10, "Amazon Video")],
        buy: [provider(10, "Amazon Video"), provider(2, "Apple TV")],
      },
    });
    expect(rokuWatchOptions(details)).toEqual({
      watch: [
        { label: "Free on Tubi", channelId: "41468", app: "Tubi" },
        { label: "Free with ads on Pluto TV", channelId: "74519", app: "Pluto TV" },
        { label: "Watch on Netflix", channelId: "12", app: "Netflix" },
        { label: "Rent or buy on Prime Video", channelId: "13", app: "Prime Video" },
        { label: "Rent or buy on Apple TV", channelId: "551012", app: "Apple TV" },
      ],
      watchNote: "",
    });
  });

  it("names services the Roku app can't open", () => {
    const details = makeDetails({
      availability: { link: null, free: [provider(212, "Hoopla")], ads: [], subscription: [], rent: [], buy: [] },
    });
    expect(rokuWatchOptions(details)).toEqual({ watch: [], watchNote: "Also on Hoopla" });
  });

  it("says so when the title isn't streaming anywhere", () => {
    expect(rokuWatchOptions(makeDetails())).toEqual({ watch: [], watchNote: "Not streaming anywhere right now" });
  });

  it("caps the number of buttons", () => {
    const names = ["Netflix", "Hulu", "Disney Plus", "Max", "Paramount Plus", "Peacock Premium", "Tubi TV", "Plex"];
    const details = makeDetails({
      availability: {
        link: null,
        free: [],
        ads: [],
        subscription: names.map((n, i) => provider(i + 1, n)),
        rent: [],
        buy: [],
      },
    });
    expect(rokuWatchOptions(details).watch).toHaveLength(6);
  });
});

describe("rokuItem and rokuRows", () => {
  it("shapes a title with ids, proxied images and a meta line", () => {
    expect(rokuItem(title, BASE)).toEqual({
      id: "movie:550",
      tmdbId: 550,
      mediaType: "movie",
      title: "Fight Club",
      description: "An insomniac office worker…",
      posterUrl: `${BASE}/img/w342/poster.jpg`,
      backdropUrl: `${BASE}/img/w1280/backdrop.jpg`,
      meta: "Movie · 1999 · ★ 8.4",
    });
  });

  it("leaves the rating out when there are too few votes", () => {
    const item = rokuItem({ ...title, mediaType: "tv", year: null, voteCount: 2 }, BASE);
    expect(item.meta).toBe("Series · TBA");
    expect(item.id).toBe("tv:550");
  });

  it("drops empty rows", () => {
    const rows = rokuRows(
      [
        { title: "Trending", items: [title] },
        { title: "Empty", items: [] },
      ],
      BASE,
    );
    expect(rows.map((r) => r.title)).toEqual(["Trending"]);
    expect(rows[0]!.items[0]!.id).toBe("movie:550");
  });
});

describe("rokuDetails", () => {
  it("builds the detail screen fields for a movie", () => {
    const d = rokuDetails(makeDetails(), BASE, true);
    expect(d).toMatchObject({
      id: "movie:550",
      posterUrl: `${BASE}/img/w780/poster.jpg`,
      backdropUrl: `${BASE}/img/w1280/backdrop.jpg`,
      tagline: "Mischief. Mayhem. Soap.",
      metaLine: "R · Movie · 1999 · 2h 19m",
      ratingLine: "★ 8.4",
      genresLine: "Drama, Thriller",
      creditsLine: "Directed by David Fincher",
      castLine: "Starring Brad Pitt, Edward Norton, Helena Bonham Carter, Meat Loaf, Jared Leto",
      trailerKey: "qtRKdVHc-cE",
      watch: [],
      watchNote: "Not streaming anywhere right now",
      saved: true,
    });
    expect(d.similar.map((s) => s.title)).toEqual(["Se7en"]);
  });

  it("describes a series with creators and seasons, and copes with missing data", () => {
    const d = rokuDetails(
      makeDetails({
        mediaType: "tv",
        certification: null,
        runtime: null,
        seasons: 1,
        directors: ["Dan Erickson"],
        cast: [],
        genres: [],
        trailer: null,
        posterPath: null,
        voteCount: 0,
      }),
      BASE,
      false,
    );
    expect(d).toMatchObject({
      metaLine: "Series · 1999 · 1 Season",
      ratingLine: "",
      creditsLine: "Created by Dan Erickson",
      castLine: "",
      genresLine: "",
      trailerKey: "",
      posterUrl: "",
      saved: false,
    });
  });

  it("pluralizes seasons and leaves out unknown credits", () => {
    const d = rokuDetails(makeDetails({ mediaType: "tv", seasons: 3, directors: [] }), BASE, false);
    expect(d.metaLine).toContain("3 Seasons");
    expect(d.creditsLine).toBe("");
  });
});

describe("BROWSE_GENRES", () => {
  it("has ten genres for movies and for shows", () => {
    expect(BROWSE_GENRES.movie).toHaveLength(10);
    expect(BROWSE_GENRES.tv).toHaveLength(10);
  });
});

describe("isPrivateIpv4", () => {
  it.each(["192.168.68.20", "10.0.0.5", "172.16.0.1", "172.31.255.255"])("accepts %s", (ip) => {
    expect(isPrivateIpv4(ip)).toBe(true);
  });

  it.each(["8.8.8.8", "172.32.0.1", "192.169.1.1", "127.0.0.1", "192.168.1.256", "roku.local", "", "192.168.1"])(
    "rejects %s",
    (ip) => {
      expect(isPrivateIpv4(ip)).toBe(false);
    },
  );
});

describe("launchOnRoku", () => {
  it("posts an ECP launch with the deep-link parameters", async () => {
    const fetchFn = vi.fn(async () => new Response(null, { status: 200 }));
    await launchOnRoku(
      { host: "192.168.68.20", channelId: "837", contentId: "qtRKdVHc-cE", mediaType: "shortFormVideo" },
      fetchFn as unknown as typeof fetch,
    );
    const [url, init] = fetchFn.mock.calls[0]! as unknown as [URL, RequestInit];
    expect(url.toString()).toBe(
      "http://192.168.68.20:8060/launch/837?contentId=qtRKdVHc-cE&mediaType=shortFormVideo",
    );
    expect(init.method).toBe("POST");
  });

  it("launches an app without deep-link parameters", async () => {
    const fetchFn = vi.fn(async (_url: URL, _init?: RequestInit) => new Response(null, { status: 200 }));
    await launchOnRoku({ host: "10.0.0.9", channelId: "41468" }, fetchFn as unknown as typeof fetch);
    expect(String(fetchFn.mock.calls[0]![0])).toBe("http://10.0.0.9:8060/launch/41468");
  });

  it("refuses hosts outside the home network without calling them", async () => {
    const fetchFn = vi.fn();
    await expect(launchOnRoku({ host: "8.8.8.8", channelId: "12" }, fetchFn)).rejects.toMatchObject({ status: 400 });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("explains how to allow it when the TV blocks the request", async () => {
    const fetchFn = vi.fn(async () => new Response(null, { status: 403 }));
    const error = await launchOnRoku({ host: "192.168.1.5", channelId: "12" }, fetchFn as unknown as typeof fetch).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(RokuLaunchError);
    expect((error as RokuLaunchError).status).toBe(403);
    expect((error as RokuLaunchError).message).toContain("Control by mobile apps");
  });

  it("reports an unreachable Roku or a refused launch as 502", async () => {
    const offline = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(
      launchOnRoku({ host: "192.168.1.5", channelId: "12" }, offline as unknown as typeof fetch),
    ).rejects.toMatchObject({ status: 502, message: "Couldn't reach the Roku" });

    const refused = vi.fn(async () => new Response(null, { status: 404 }));
    await expect(
      launchOnRoku({ host: "192.168.1.5", channelId: "999" }, refused as unknown as typeof fetch),
    ).rejects.toMatchObject({ status: 502 });
  });
});
