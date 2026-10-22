# multistream

A Netflix-style catalog for home use: posters, cast, trailers, ratings, and a "Where to watch" panel that puts **free** legal options first. Runs on a Raspberry Pi 5 and is used from any TV, phone or laptop on your Wi-Fi.

**What it is not:** it doesn't host or stream movies itself. It shows where each title is available (Tubi, Pluto TV, Roku Channel, Netflix, rent/buy, and so on) and links you there. Data comes from [TMDB](https://www.themoviedb.org) (catalog) and JustWatch via TMDB (availability).

## Features (built)
- Home page with a rotating hero banner and rows: Trending, In Theaters, Coming Soon, Popular and Top Rated movies and shows
- Browse movies and shows by genre and sort order, with "Load more"
- Search across movies and shows
- Detail page: poster, backdrop, tagline, age rating, runtime, genres, cast photos, director, click-to-play trailer, similar titles
- **Where to watch**: free and ad-supported first, then subscription, then rent/buy
- Profiles and a per-profile **My List** (stored in SQLite on the Pi)
- TV-remote friendly: arrow keys / D-pad move focus, Back button works (Samsung, LG, Fire TV, Google TV)
- **Roku app** (`roku/`): Home, Movies, Shows, Search, My List and profiles on Roku TVs, which have no web browser. "Watch on…" opens the streaming app on the TV. Tested on a Roku TV. See [docs/ROKU-GUIDE.md](docs/ROKU-GUIDE.md).

## Planned
Live TV (HDHomeRun tuner), pay-per-view / events schedule, Jellyfin for your own library.

## Run it on your computer
Needs Node 22.13+ (24 recommended) and pnpm.

```bash
pnpm install
cp .env.example .env     # then put your TMDB key in .env
pnpm dev                 # server on :8080, app on http://localhost:5173
```

Get a free key at <https://www.themoviedb.org/settings/api>. The server keeps it private; the browser never sees it.

Other commands: `pnpm test` (all tests), `pnpm typecheck`, `pnpm build` (production front end into `dist/`), `pnpm start` (serve API + built front end on :8080).

Roku app: `pnpm roku:check` (check the code), `pnpm roku:build` (package into `out/`), `pnpm roku:deploy` (install on a TV in developer mode). Settings go in `.env`; see [docs/ROKU-GUIDE.md](docs/ROKU-GUIDE.md).

## Run it on the Raspberry Pi
See [docs/PI-SETUP-GUIDE.md](docs/PI-SETUP-GUIDE.md) for the full walkthrough (set up the Pi, wire it to the router, control it from your laptop, deploy). Short version once the Pi is ready:

```bash
git clone <this repo> multistream && cd multistream
cp .env.example .env && nano .env      # add TMDB_API_KEY
docker compose up -d --build
```
Then open `http://<pi-ip>:8080` on any device on your network.

## Layout
- `server/` Hono API: TMDB client with caching, SQLite store, static file serving, Roku feed (`/api/roku/*`) and image proxy (`/img/*`)
- `src/` React app (Vite, Tailwind, React Router, Zustand)
- `shared/` types and formatting used by the server and the web app
- `roku/` Roku app (BrightScript/SceneGraph); `scripts/roku.ts` builds and installs it
- `docs/` guides

## Notes
- No login: anyone on your home network can use it. Don't expose port 8080 to the internet; use Tailscale to reach it away from home.
- TMDB's free API is for non-commercial use. If this becomes a paid product you need a commercial license from them.
