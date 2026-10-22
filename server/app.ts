import { Hono } from "hono";
import { z } from "zod";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { LIST_KINDS, SORTS, TmdbError, type ListKind, type Tmdb } from "./tmdb.ts";
import { StoreError, type Store } from "./store.ts";
import { RokuLaunchError } from "./roku.ts";
import { rokuRoutes } from "./rokuRoutes.ts";
import { fetchTmdbImage, ImageError } from "./images.ts";

export interface AppDeps {
  tmdb: Pick<Tmdb, "home" | "list" | "discover" | "search" | "genres" | "details">;
  store: Store;
  /** Directory of the built front end. When absent, only /api is served. */
  staticDir?: string;
  /** Used for the image proxy and for talking to Rokus; defaults to the global fetch. */
  fetchFn?: typeof fetch;
}

const mediaType = z.enum(["movie", "tv"]);
const id = z.coerce.number().int().positive();
const page = z.coerce.number().int().min(1).max(500).default(1);

const browseQuery = z.object({
  genre: z.coerce.number().int().positive().optional(),
  sort: z.enum(SORTS).optional(),
  page,
});

const profileBody = z.object({ name: z.string() });

export function createApp(deps: AppDeps): Hono {
  const { tmdb, store, staticDir, fetchFn } = deps;
  const app = new Hono();

  app.onError((error, c) => {
    if (error instanceof TmdbError) return c.json({ error: error.message }, error.status as 404 | 502);
    if (error instanceof StoreError) return c.json({ error: error.message }, error.status);
    if (error instanceof RokuLaunchError) return c.json({ error: error.message }, error.status);
    if (error instanceof ImageError) return c.json({ error: error.message }, error.status);
    if (error instanceof z.ZodError) return c.json({ error: "Invalid request", issues: error.issues }, 400);
    console.error(error);
    return c.json({ error: "Something went wrong" }, 500);
  });

  const api = new Hono();
  api.use("*", async (c, next) => {
    await next();
    c.header("Cache-Control", "no-store");
  });

  api.get("/health", (c) => c.json({ ok: true }));

  api.get("/home", async (c) => c.json(await tmdb.home()));

  api.get("/lists/:kind", async (c) => {
    const kind = c.req.param("kind") as ListKind;
    if (!LIST_KINDS.includes(kind)) return c.json({ error: "Unknown list" }, 404);
    const { page: p } = z.object({ page }).parse(c.req.query());
    return c.json(await tmdb.list(kind, p));
  });

  api.get("/browse/:type", async (c) => {
    const type = mediaType.parse(c.req.param("type"));
    const query = browseQuery.parse(c.req.query());
    return c.json(await tmdb.discover(type, { genre: query.genre, sort: query.sort, page: query.page }));
  });

  api.get("/search", async (c) => {
    const query = z.object({ q: z.string().max(100).default(""), page }).parse(c.req.query());
    return c.json(await tmdb.search(query.q, query.page));
  });

  api.get("/genres/:type", async (c) => c.json(await tmdb.genres(mediaType.parse(c.req.param("type")))));

  api.get("/title/:type/:id", async (c) => {
    const type = mediaType.parse(c.req.param("type"));
    return c.json(await tmdb.details(type, id.parse(c.req.param("id"))));
  });

  api.get("/profiles", (c) => c.json(store.profiles()));

  api.post("/profiles", async (c) => {
    const body = profileBody.parse(await c.req.json().catch(() => ({})));
    return c.json(store.createProfile(body.name), 201);
  });

  api.delete("/profiles/:id", (c) => {
    store.deleteProfile(id.parse(c.req.param("id")));
    return c.body(null, 204);
  });

  api.get("/profiles/:id/watchlist", (c) => c.json(store.watchlist(id.parse(c.req.param("id")))));

  api.put("/profiles/:id/watchlist/:type/:titleId", async (c) => {
    const profileId = id.parse(c.req.param("id"));
    const type = mediaType.parse(c.req.param("type"));
    // Look the title up ourselves instead of trusting what a client sends.
    const { similar: _similar, cast: _cast, ...details } = await tmdb.details(type, id.parse(c.req.param("titleId")));
    store.addToWatchlist(profileId, {
      id: details.id,
      mediaType: details.mediaType,
      title: details.title,
      overview: details.overview,
      posterPath: details.posterPath,
      backdropPath: details.backdropPath,
      year: details.year,
      rating: details.rating,
      voteCount: details.voteCount,
      genreIds: details.genreIds,
    });
    return c.body(null, 204);
  });

  api.delete("/profiles/:id/watchlist/:type/:titleId", (c) => {
    store.removeFromWatchlist(
      id.parse(c.req.param("id")),
      mediaType.parse(c.req.param("type")),
      id.parse(c.req.param("titleId")),
    );
    return c.body(null, 204);
  });

  api.route("/roku", rokuRoutes(deps));

  app.route("/api", api);
  // Hono ignores a mounted sub-app's notFound handler, so unknown API paths are caught here,
  // before the SPA fallback below can answer them with HTML.
  app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

  // TMDB images over plain HTTP for the Roku app. Outside /api so they can be cached.
  app.get("/img/:size/:file", (c) => fetchTmdbImage(c.req.param("size"), c.req.param("file"), fetchFn));

  if (staticDir && existsSync(join(staticDir, "index.html"))) {
    app.use("*", serveStatic({ root: staticDir }));
    // Client-side routes (e.g. /movie/123) all get the app shell. It is read per request so a
    // rebuilt front end (new hashed file names) is picked up without restarting the server.
    app.get("*", (c) => c.html(readFileSync(join(staticDir, "index.html"), "utf8")));
  }

  return app;
}
