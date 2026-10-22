import { Hono, type Context } from "hono";
import { z } from "zod";
import type { MediaType, Title } from "../shared/types.ts";
import type { AppDeps } from "./app.ts";
import { StoreError, type Store } from "./store.ts";
import { BROWSE_GENRES, launchOnRoku, rokuDetails, rokuItem, rokuRows } from "./roku.ts";

const mediaType = z.enum(["movie", "tv"]);
const id = z.coerce.number().int().positive();
const profileQuery = z.object({ profile: id.optional() });

const launchBody = z.object({
  host: z.string().max(15),
  channelId: z.string().regex(/^\d{1,10}$/),
  contentId: z.string().max(255).optional(),
  mediaType: z.string().max(20).optional(),
});

/** The Pi's own address as the Roku reached it, used to build absolute image URLs. */
function origin(c: Context): string {
  return new URL(c.req.url).origin;
}

/** A profile's saved titles, or none when the Roku remembers a profile that has since been deleted. */
function savedTitles(store: Store, profileId: number | undefined): Title[] {
  if (profileId === undefined) return [];
  try {
    return store.watchlist(profileId);
  } catch (error) {
    if (error instanceof StoreError && error.status === 404) return [];
    throw error;
  }
}

/** Routes for the Roku app, mounted at /api/roku. */
export function rokuRoutes({ tmdb, store, fetchFn }: AppDeps): Hono {
  const roku = new Hono();

  roku.get("/home", async (c) => {
    const { profile } = profileQuery.parse(c.req.query());
    const home = await tmdb.home();
    const saved = savedTitles(store, profile);
    const rows = saved.length > 0 ? [{ title: "My List", items: saved }, ...home.rows] : home.rows;
    return c.json({ rows: rokuRows(rows, origin(c)) });
  });

  roku.get("/browse/:type", async (c) => {
    const type: MediaType = mediaType.parse(c.req.param("type"));
    const genres = BROWSE_GENRES[type];
    const pages = await Promise.all([
      tmdb.discover(type, {}),
      ...genres.map((g) => tmdb.discover(type, { genre: g.id })),
    ]);
    const rows = [
      { title: type === "movie" ? "Popular Movies" : "Popular Shows", items: pages[0]!.items },
      ...genres.map((g, i) => ({ title: g.name, items: pages[i + 1]!.items })),
    ];
    return c.json({ rows: rokuRows(rows, origin(c)) });
  });

  roku.get("/search", async (c) => {
    const { q } = z.object({ q: z.string().max(100).default("") }).parse(c.req.query());
    const page = await tmdb.search(q, 1);
    return c.json({ items: page.items.map((t) => rokuItem(t, origin(c))) });
  });

  roku.get("/list/:profileId", (c) => {
    const items = store.watchlist(id.parse(c.req.param("profileId")));
    return c.json({ items: items.map((t) => rokuItem(t, origin(c))) });
  });

  roku.get("/title/:type/:id", async (c) => {
    const type = mediaType.parse(c.req.param("type"));
    const titleId = id.parse(c.req.param("id"));
    const { profile } = profileQuery.parse(c.req.query());
    const details = await tmdb.details(type, titleId);
    const saved = savedTitles(store, profile).some((t) => t.mediaType === type && t.id === titleId);
    return c.json(rokuDetails(details, origin(c), saved));
  });

  roku.post("/launch", async (c) => {
    const body = launchBody.parse(await c.req.json().catch(() => ({})));
    await launchOnRoku(body, fetchFn);
    return c.body(null, 204);
  });

  return roku;
}
