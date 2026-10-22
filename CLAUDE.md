# multistream

Web app project. _(stack context wired by Builder Hub, 2026-10-17)_

_Claude Code reads this file automatically._

## Tools & stacks available to me
- **Full tool catalog** — every tool / service / API / app I use, with versions and where each API key lives: `C:\Users\chris\TOOL-STACK.md`. Read it before choosing a tool or scoping work, and **prefer tools I already have**.
- **Stack profiles** — focused tool set + conventions per project type: `C:\Users\chris\.claude\stack-profiles`.
- **All my other projects** — the Builder Hub registry (name → path · type · stack · notes): `C:\Users\chris\.claude\builder-hub-projects.md` (auto-managed). When I mention another project, resolve it there — you may read those folders directly.
- This project's type is **Web app** — its profile is inlined below.

---

# Profile: Web app / SaaS / dashboard

**Use when:** building a web app, SaaS, dashboard, or content site that needs a build step.

## Default stack (focused)
- **Framework:** **Next.js** (App Router) for full-stack/SSR SaaS; **Vite + React** for SPAs and 3D/game UIs.
- **UI:** React 19, TypeScript, **Tailwind + shadcn/ui** (Radix primitives). Icons `lucide-react`, charts `Recharts`.
- **State/forms:** Zustand; `react-hook-form` + **Zod**.

## Backend / data (pick per need)
- **Supabase** (Postgres + Auth + Storage) — fastest all-in-one.
- **Neon** (serverless Postgres) + **Prisma** or **Drizzle** — when you want your own ORM.
- **Firebase** — when you need realtime + tight mobile integration.
- **Upstash Redis** — rate-limiting / caching. **Inngest** — background jobs / cron / events.

## Cross-cutting services
- **Auth:** Clerk (orgs/MFA/RBAC) · or Supabase/Firebase Auth.
- **Payments:** Stripe (web). **Email:** Resend. **SMS:** Twilio. **Video:** Daily.co.
- **Monitoring:** Sentry. **Hosting:** Vercel (Next SaaS) or Netlify (static/SSR).

## Conventions (learned the hard way)
- **Never** put a secret in a `NEXT_PUBLIC_*` var — it's inlined into the client bundle. Secrets are server-only. (This bit FounderOS — see security TODOs.)
- **pnpm** for monorepos (workspaces). Tests: **Vitest** (+ Testing Library); E2E: **Playwright**.

## Reference projects on disk
`New-apps/*` (building-compliance-os, cashpilot, freight-verify — modern Next 16 + shadcn + Stripe + Sentry) · `Overtime-Care` (HIPAA pnpm monorepo, Prisma/AWS/Terraform) · `MA-Training` (Vite SPA).

---

## This project
Home streaming-catalog app (legal: shows where to watch, does not host video). Hono API + React/Vite front end, TMDB data, SQLite (node:sqlite) for profiles/My List, deployed with Docker on a Raspberry Pi 5. See README.md and docs/PI-SETUP-GUIDE.md.
- Commands: `pnpm dev`, `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm start`; Roku: `pnpm roku:check|roku:build|roku:deploy` (see docs/ROKU-GUIDE.md).
- Server holds the TMDB key (`TMDB_API_KEY` in .env); never expose it to the client.
- Every function gets tests; all pass before moving on.
- Roku app (`roku/`): the Pi shapes data in `server/roku.ts` so BrightScript stays thin. Pure BrightScript goes in `roku/components/lib/helpers.brs` and is tested off-device with `@rokucommunity/brs` (`roku/tests/`); `pnpm test` also runs BrighterScript validation on all Roku files. Screens can only be verified on a real Roku (dev TV: 58" Hisense at 192.168.68.53; with `ROKU_HOST`/`ROKU_DEV_PASSWORD` in .env you can press keys via ECP `:8060/keypress/<Key>`, take screenshots via the dev web server `/plugin_inspect` (digest auth, user rokudev) and read crashes on telnet port 8085). An AA passed through a SceneGraph node field comes out with lowercase keys, so JSON bodies are encoded before they go into a task field (`LaunchBody`). Roku forbids apps launching other apps, so "Watch on…" goes through the Pi sending ECP `launch` to the TV, which opens the service app, not the specific title.
- Edit files with the Edit tool or bash, not PowerShell `Set-Content`: Windows PowerShell 5.1 re-encodes UTF-8 and garbles characters like `·` and `…`.
- Planned next: live TV (HDHomeRun), pay-per-view/events schedule, Jellyfin.
