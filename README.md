# 🌱 BloomKnights

Hackathon project — **Best Clean Energy Solution** track. See the environmental cost of everyday life, check the air you're breathing right now, and find clean-energy actions and events near you.

## Quick start

```bash
bun install
bun run dev        # http://localhost:3000
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
