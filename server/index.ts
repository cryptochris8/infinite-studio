import { serve } from "@hono/node-server";
import { resolve } from "node:path";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { Store } from "./store.ts";
import { Tmdb } from "./tmdb.ts";

// Node 24 loads a .env file natively; ignore the error when there isn't one.
try {
  process.loadEnvFile();
} catch {
  /* no .env file: rely on real environment variables */
}

const config = loadConfig();
const store = new Store(resolve(config.DATA_DIR, "multistream.db"));
const tmdb = new Tmdb({ apiKey: config.TMDB_API_KEY, region: config.REGION, language: config.LANGUAGE });
const app = createApp({ tmdb, store, staticDir: resolve("dist") });

const server = serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  console.log(`multistream listening on http://localhost:${info.port}`);
});

function shutdown(): void {
  server.close();
  store.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
