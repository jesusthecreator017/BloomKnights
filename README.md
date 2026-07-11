# 🌱 BloomKnights

Hackathon project — **Best Clean Energy Solution** track. See the environmental cost of everyday life, check the air you're breathing right now, and find clean-energy actions and events near you.

## Quick start

```bash
bun install
cp .env.example .env   # defaults match docker-compose
bun run db:up          # start Postgres (Docker, host port 5433)
bun run db:push        # create tables
bun run db:seed        # load quiz questions
bun run dev            # http://localhost:3000
```

## Database & API

Postgres runs in Docker (`docker-compose.yml`), accessed through **Drizzle ORM** (`src/db/`). Auth is **better-auth** (`src/lib/auth.ts`), email + password, sessions in Postgres.

| Command | What it does |
|---|---|
| `bun run db:up` / `db:down` | Start / stop the Postgres container |
| `bun run db:push` | Sync `src/db/schema.ts` to the database (no migration files) |
| `bun run db:seed` | Load seed quizzes |
| `bun run db:studio` | Drizzle Studio GUI |

**Environmental data endpoints** (all proxy free, keyless APIs — pattern in `src/routes/api/air-quality.ts`, shared helpers in `src/lib/api-utils.ts`):
`GET /api/air-quality`, `/api/uv-solar`, `/api/ocean`, `/api/marine-life`, `/api/coral` (all `?lat=&lng=`), `/api/emissions?country=USA`, `/api/places?lat=&lng=&kind=recycling|charging|waste`.

**Quiz + leaderboard** (logic in `src/lib/quiz.ts`):
`GET /api/quizzes`, `GET /api/quizzes/:slug` (no answer key), `POST /api/quizzes/:slug/submit` (requires login; one attempt per quiz), `GET /api/leaderboard`.

### Tests

Integration tests run against the `bloomknights_test` database (created automatically by `db:up`):

```bash
bun run db:push:test   # once, to create test tables
bun run test
```

## Stack

- **Bun** — runtime + package manager
- **TanStack Start** — full-stack React: file-based routing (`src/routes/`), server routes, SSR
- **TanStack Query** — client data fetching
- **Tailwind CSS v4 + EinUI** — liquid-glass components in `src/components/ui/` (add more: `bunx shadcn@latest add https://ui.eindev.ir/r/<name>.json`)
- **MapLibre GL** — free OpenFreeMap tiles, no API key
- **Biome** — lint + format

## Commands

| Command | What it does |
|---|---|
| `bun run dev` | Dev server on port 3000 |
| `bun run lint` | Biome check (CI runs this) |
| `bun run lint:fix` | Auto-fix lint/format issues |
| `bun run typecheck` | `tsc --noEmit` (CI runs this) |
| `bun run build` | Production build (CI runs this) |

CI runs lint → typecheck → build on every push to `main` and every PR. Run `bun run lint:fix && bun run typecheck` before pushing.

## Where things live

- **Pages**: `src/routes/index.tsx` (home), `src/routes/map.tsx`, `src/routes/act.tsx`
- **API**: `src/routes/api/events.ts`, `src/routes/api/air-quality.ts` (proxies [Open-Meteo](https://open-meteo.com/en/docs/air-quality-api), no key needed)
- **Event seed data**: `src/data/events.json` — add events here, they appear on the map instantly
- **Map component**: `src/components/live-map.tsx`
- **Layout/nav**: `src/routes/__root.tsx`
