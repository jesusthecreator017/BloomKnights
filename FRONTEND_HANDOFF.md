# BloomKnights — Frontend Handoff Prompt

> Paste everything below to the Claude working on the frontend. It documents the whole app and every API the backend has built so far.

---

You are the frontend developer on **BloomKnights**, a 12-hour hackathon project for the **"Best Clean Energy Solution"** track. The app raises environmental awareness: it shows the damage of everyday human activity and the clean-energy actions people can take. Your job is to build the React UI that consumes the backend APIs that already exist. **The entire backend is done and running — do not rebuild it. Consume it.**

## Tech stack (already set up — use it, don't swap it)

- **Runtime/pm:** Bun. Run everything with `bun run <script>`.
- **Framework:** TanStack Start (full-stack React 19, file-based routing in `src/routes/`, SSR). Pages are `src/routes/*.tsx` with `createFileRoute`.
- **Client data:** TanStack Query is already wired (`src/integrations/tanstack-query/`). Use `useQuery`/`useMutation` for all fetching.
- **Styling:** Tailwind CSS v4 (dark theme by default). Global styles in `src/styles.css`.
- **UI components:** EinUI liquid-glass components already in `src/components/ui/` — `GlassCard` (+ `GlassCardHeader/Title/Description/Content/Footer`), `GlassButton` (variants: default, primary, outline, ghost, destructive; sizes: sm, default, lg, icon), `GlassBadge`, `GlassDialog`, `GlassTabs`, `GlassInput`, `GlassProgress`. Add more with `bunx shadcn@latest add https://ui.eindev.ir/r/<name>.json`. Glass components render white text — keep them on the dark gradient background.
- **Map:** MapLibre GL via `react-map-gl/maplibre`, free OpenFreeMap dark tiles (no API key). Existing map component: `src/components/live-map.tsx`. Import `MapGL` aliased (do NOT name it `Map` — the linter blocks shadowing the global).
- **Auth on the client:** `src/lib/auth-client.ts` exports `signIn`, `signUp`, `signOut`, `useSession` (from better-auth/react). Use these — sessions are cookie-based and sent automatically with same-origin `fetch`.
- **Icons:** `lucide-react`.

## Existing routes/pages (extend these, keep the style)

- `src/routes/__root.tsx` — layout: sticky glass nav (Home/Map/Act), emerald/cyan ambient gradient background, `dark` class on `<html>`.
- `src/routes/index.tsx` — Home: hero + "daily damage" stat cards.
- `src/routes/map.tsx` — Map page (loads `live-map.tsx` behind `ClientOnly` — MapLibre can't SSR).
- `src/routes/act.tsx` — solutions/actions cards.

## Local setup

```bash
cp .env.example .env          # required or the app throws on boot
bun install
bun run db:up                 # Postgres in Docker (host port 5433)
bun run db:push               # create tables
bun run db:seed               # load quizzes
bun run dev                   # http://localhost:3000 (or 3001 if busy)
```

---

# THE API — everything you can call

All endpoints are same-origin (`/api/...`), return JSON, and set proper status codes. Location endpoints take `?lat=&lng=` (validated: 400 on missing/invalid/out-of-range). Upstream failures return 502. **All auth is cookie-based — logged-in requests just work if you use same-origin fetch / the auth-client.**

## Environmental data (for map layers & info panels)

### `GET /api/air-quality?lat=&lng=`
Live US AQI + pollutants (Open-Meteo). Shape: `{ current: { us_aqi, pm2_5, pm10, carbon_monoxide, nitrogen_dioxide, ozone }, current_units, ... }`. Already used by `live-map.tsx` — copy that pattern.

### `GET /api/uv-solar?lat=&lng=`
UV index + solar potential (Open-Meteo). Great for a "should you go solar here?" panel.
```json
{
  "current": { "uv_index": 2.3, "shortwave_radiation": 376 },
  "current_units": { "shortwave_radiation": "W/m²" },
  "daily": { "uv_index_max": [8.3], "sunshine_duration": [38917.75], "shortwave_radiation_sum": [29.55] },
  "daily_units": { "sunshine_duration": "s", "shortwave_radiation_sum": "MJ/m²" }
}
```

### `GET /api/ocean?lat=&lng=`
Sea-surface temp, waves, currents (Open-Meteo Marine). Returns empty `current` values far inland.
```json
{ "current": { "sea_surface_temperature": 32.2, "wave_height": 0.4, "ocean_current_velocity": 0.4 },
  "current_units": { "sea_surface_temperature": "°C", "wave_height": "m" } }
```

### `GET /api/coral?lat=&lng=`
NOAA Coral Reef Watch bleaching alert at the nearest 5km reef cell.
```json
{ "available": true, "time": "2026-07-09T12:00:00Z", "lat": 25.775, "lng": -80.175,
  "alertArea": 2, "alertLabel": "Warning" }
```
`alertArea` 0–4 → labels: No Stress / Watch / Warning / Alert Level 1 / Alert Level 2. If no reef nearby: `{ "available": false, "reason": "..." }`. Color-code it (green→red). Try Miami `25.76,-80.19` for a live "Warning".

### `GET /api/marine-life?lat=&lng=`
Marine species sightings near a point (OBIS), aggregated & sorted by count. `total` = all records in area, `species` = top 25.
```json
{ "total": 472918, "sampled": 200,
  "species": [ { "name": "Lucania parva", "common": "NA", "count": 9 }, ... ] }
```
Note `common` may be the string `"NA"` or missing — fall back to the scientific `name`.

### `GET /api/emissions?country=USA`
Country carbon emissions (Climate TRACE, cached 24h in Postgres). `country` is an ISO-3 code (default USA). `data` is an array (usually one entry). Numbers are in tonnes — format them (e.g. billions of tonnes CO2e).
```json
{ "country": "USA", "cached": true, "data": [ {
  "country": "USA", "rank": 2,
  "emissions": { "co2": 53795686037.8, "ch4": 364677854.8, "n2o": 7018608.5, "co2e_100yr": 68453343280.4, "co2e_20yr": 89585216627.9 },
  "worldEmissions": { "co2e_100yr": 568703620064.7, ... }
} ] }
```
Good for a "USA vs world" bar. `co2e_100yr` is the headline number.

### `GET /api/places?lat=&lng=&kind=recycling|charging|waste`
Real facilities from OpenStreetMap within ~15km. `kind` defaults to `recycling`; invalid kind → 400. Perfect as clickable map markers.
```json
{ "kind": "recycling", "count": 60,
  "places": [ { "id": 361100877, "name": "San Francisco Dump", "lat": 37.70, "lng": -122.39, "kind": "recycling" }, ... ] }
```

> There's also `GET /api/events` (seeded local eco-events with `{id,name,description,category,date,lat,lng,city,url}`) already rendered as markers in `live-map.tsx`.

## Quiz + leaderboard (gamification)

### `GET /api/quizzes`
List for a quiz-picker screen. There are 8 curated standard quizzes (`createdBy: null`) plus any Gemini-generated ones (`createdBy: "<userId>"`, `category: "ai-generated"`) — split them client-side on `createdBy`.
```json
[ { "slug": "daily-footprint", "title": "Your Daily Footprint", "category": "awareness", "createdBy": null, "questionCount": 5, "totalPoints": 50 }, ... ]
```

### `GET /api/quizzes/:slug`
Questions to render — **no answer key is sent** (grading is server-side).
```json
{ "slug": "daily-footprint", "title": "...", "category": "awareness",
  "questions": [ { "id": 29, "prompt": "How much CO2 does burning one gallon of gasoline release?",
                   "choices": ["0.9 kg","3.2 kg","8.9 kg","20 kg"], "points": 10 }, ... ] }
```
404 if slug unknown.

### `POST /api/quizzes/:slug/submit`  🔒 requires login
Body: `{ "answers": number[] }` — the chosen choice index per question, in question order. Returns the score AND the answer key + explanations (reveal them in a results screen).
```json
{ "status": "graded", "score": 30, "maxScore": 40,
  "results": [ { "questionId": 29, "correctIndex": 2, "yourAnswer": 2, "correct": true,
                 "explanation": "Each gallon releases about 8.9 kg of CO2 — ..." }, ... ] }
```
Status codes to handle: **401** not logged in → prompt sign-in; **409** already completed this quiz (one attempt per user per quiz — disable the button / show "already done"); **400** malformed body; **404** unknown quiz.

### `GET /api/leaderboard?limit=20`
Top users globally plus the current user's own rank (`me` is `null` if logged out or no attempts).
```json
{ "entries": [ { "rank": 1, "userId": "...", "name": "Demo", "points": 30, "quizzesTaken": 1 }, ... ],
  "me": { "rank": 1, "userId": "...", "name": "Demo", "points": 30, "quizzesTaken": 1 } }
```

### `POST /api/quizzes/generate`  🔒 requires login, rate-limited
Generates a fresh 5-question quiz with Gemini and immediately persists it (same grading/leaderboard path as curated quizzes). Body: `{ "topic"?: string }` — omit `topic` for a random "reshuffle", or pass one for a specific ask (e.g. `"solar panel recycling"`).
```json
{ "slug": "ai-solar-panel-recycling-a1b2c3d4", "title": "Solar Panel Recycling", "category": "clean-energy",
  "questions": [ { "id": 301, "prompt": "...", "choices": ["...","...","...","..."], "points": 10 }, ... ] }
```
Same shape as `GET /api/quizzes/:slug` — no answer key, ready to play immediately. Status codes: **401** not logged in; **429** (with `Retry-After`) if this user has generated 5+ quizzes in the last 5 minutes — this is on top of the global per-IP limit; **500** if `GEMINI_API_KEY` isn't configured server-side; **502** if Gemini fails or returns something unusable.

## Geocoding (Places API (New) proxy, used by /explorer's search box)

### `GET /api/geocode/autocomplete?input=<text>`
Address/place suggestions as the user types (debounce client-side). 400 if `input` missing; 500 if `GOOGLE_PLACES_API_KEY` isn't configured; 502 on an upstream failure.
```json
{ "suggestions": [ { "placeId": "ChIJ...", "text": "Seattle, WA, USA" }, ... ] }
```

### `GET /api/geocode/place?id=<placeId>`
Resolves a `placeId` (from the autocomplete response) to coordinates. Same error codes as above.
```json
{ "formattedAddress": "Seattle, WA, USA", "lat": 47.6062, "lng": -122.3321 }
```

## Cities (city-vs-city leaderboard)

### `GET /api/cities`
All 26 seeded cities (14 US + 12 global), ranked by the combined quiz score of everyone who's joined them.
```json
{ "cities": [ { "rank": 1, "slug": "nyc", "name": "New York City", "country": "USA", "points": 120, "memberCount": 4 }, ... ] }
```

### `GET /api/cities/:slug?limit=20`
One city's individual leaderboard (same shape as `/api/leaderboard`, scoped to that city's members) plus city info. 404 on an unknown slug.
```json
{ "city": { "slug": "nyc", "name": "New York City", "country": "USA" },
  "entries": [ { "rank": 1, "userId": "...", "name": "Demo", "points": 30, "quizzesTaken": 1 }, ... ],
  "me": null }
```

### `GET /api/user/city`  🔒 requires login
The signed-in user's currently joined city, or `null` if they haven't joined one. **401** if signed out.
```json
{ "city": { "slug": "nyc", "name": "New York City", "country": "USA" } }
```

### `POST /api/user/city`  🔒 requires login
Join or switch cities — a user belongs to exactly one at a time; switching immediately re-attributes their full points total to the new city (no historical point-locking). Body: `{ "citySlug": string }`. **401** signed out, **404** unknown slug, **400** malformed body.
```json
{ "city": { "slug": "la", "name": "Los Angeles", "country": "USA" } }
```

## Auth (better-auth) — use the client, not raw fetch

```ts
import { signUp, signIn, signOut, useSession } from "#/lib/auth-client";

await signUp.email({ email, password, name });   // min password length 8
await signIn.email({ email, password });
const { data: session } = useSession();           // session?.user = { id, name, email }
await signOut();
```
Raw endpoints exist under `/api/auth/*` (e.g. `POST /api/auth/sign-up/email`) but prefer the client. Sessions are httpOnly cookies — nothing to store manually.

---

# What to build (suggested — use your judgment)

1. **Map layer switcher** on `/map`: a `GlassTabs` or button group to toggle overlays — air quality, UV/solar, ocean/coral, recycling/charging places. Fetch the relevant endpoint for the current map center (debounce/round coords like `live-map.tsx` already does for air-quality) and render markers or a glass info panel.
2. **Location detail panel**: when a user clicks the map or searches a place, show a `GlassCard` stack: AQI, UV & solar potential, nearest coral status, top marine species, nearby recycling/charging. This is the "environmental info for a place" the brief asks for.
3. **Emissions widget**: a compact chart (USA vs world `co2e_100yr`) on Home or a dedicated `/data` page.
4. **Quiz flow** (`/quiz` + `/quiz/:slug`): list quizzes → play (radio choices, `GlassProgress` for progress) → submit → results screen revealing correct answers + explanations → award points. Gate submit behind auth (show a sign-in `GlassDialog` on 401).
5. **Leaderboard** (`/leaderboard`): ranked `GlassCard` list, highlight `me`.
6. **Auth UI**: sign-up / sign-in forms (a `GlassDialog` is enough), and show the logged-in user + points in the nav.

## Conventions & gotchas

- **Fetch pattern**: wrap every call in `useQuery`; key by endpoint + params (see `live-map.tsx`). For submit, use `useMutation` + invalidate the `["leaderboard"]` query on success.
- **Map coords**: round the center before using it as a query key so panning a few blocks doesn't refetch (pattern already in `live-map.tsx`).
- **Keep it on-brand**: dark background, glass surfaces, emerald/cyan accents, `lucide-react` icons. Match `index.tsx` and `__root.tsx`.
- **Client-only for maps**: anything using MapLibre must be inside `<ClientOnly>` (it can't server-render).
- **Verify before claiming done**: `bun run lint && bun run typecheck && bun run build` must pass. CI runs these plus tests on every PR.
- Work on a feature branch off `main` and open a PR (the `api` branch's PR #2 is already green and will be merged).

Ask if any response shape is unclear — but everything above is copied from live responses, so it's accurate as of handoff.

---

# UPDATE — API hardening (2026-07-11)

The backend added caching, rate limiting, and a JSON-only policy. **No response shapes changed** — everything above is still accurate. But there are three behavioral rules your fetch code must follow now.

## 1. The API is JSON-exclusive (new: 406 / 415)

A global middleware guards every `/api/*` route (except `/api/auth/*`, which better-auth owns):

- **Don't send an `Accept` header that excludes JSON.** A normal `fetch()` sends `Accept: */*` which is fine. Just never set `Accept: application/xml` or `text/html` on API calls → you'd get **406**.
- **Every write (POST/PUT/PATCH) must send `content-type: application/json`.** This means the quiz submit call **must** include that header, or it returns **415** (before it even checks auth):

```ts
await fetch(`/api/quizzes/${slug}/submit`, {
  method: "POST",
  headers: { "content-type": "application/json" }, // REQUIRED now
  body: JSON.stringify({ answers }),
});
```
If you use a shared fetch/mutation helper, set `content-type: application/json` there once. The better-auth client already does this for auth calls, so sign-in/sign-up are unaffected.

## 2. Rate limiting (new: 429)

Per-IP fixed window:
- Data + quiz endpoints: **100 requests / minute**
- Auth endpoints: **20 requests / minute**

Over the limit → **429** with a `Retry-After` header (seconds). What to do:
- **Debounce map-driven fetches** and keep rounding the map center before using it as a TanStack Query key (the existing `live-map.tsx` already does this) — panning must not fire a request per pixel.
- **Handle 429 softly**: don't crash the UI. Show a subtle "loading / slow down" state and let TanStack Query retry after the `Retry-After` delay rather than hammering.

```ts
useQuery({
  queryKey: ["air-quality", roundedCoords],
  queryFn: fetchAqi,
  retry: (count, err) => count < 2,       // don't spam retries
  staleTime: 5 * 60_000,                    // reuse results, fewer calls
});
```

## 3. Server-side caching (transparent — just context)

Identical requests (same rounded coordinates) are cached server-side for a while (weather ~30 min, coral ~6 h, marine-life/places ~24 h) and deduped, so a repeat call returns in ~5ms and costs zero third-party quota. You don't need to do anything — it just means reusing the same rounded coords across components is essentially free. The leaderboard is also cached ~15s and refreshes right after any quiz submit.

## TL;DR for your code
- Add `content-type: application/json` to the quiz-submit fetch (and any other POST).
- Never set a non-JSON `Accept` header on `/api/*`.
- Round map coords for query keys + debounce; handle 429 with a soft retry.
- Everything else in this doc is unchanged.
