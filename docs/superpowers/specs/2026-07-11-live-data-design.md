# Live data instead of hardcoded JSON — design

Date: 2026-07-11. Approved by Jesus in-session.

Goal: `/api/events`, `/api/initiatives`, and the Gemini grounding facts stop
serving hardcoded data and use live APIs, with the old static data retained
only as a fallback so the demo never breaks.

Shared pattern for all three: live fetch → validate/map (pure, unit-tested) →
24h in-process cache (`cached()` / `geoCacheKey`) → static fallback on any
failure. Response shapes unchanged, so no frontend edits are required; both
geo endpoints accept optional `?lat=&lng=` (default Orlando) so the map can
pass its center later.

1. **Initiatives → Google Places Text Search** (`GOOGLE_PLACES_API_KEY`,
   already provisioned). Query "environmental organization volunteer
   conservation" with a 30km location bias; map to `EcoInitiative`
   (`mapPlacesToInitiatives`, pure). Fallback: `src/data/initiatives.json`.
2. **Events → Gemini + Google Search grounding** (`findLiveEvents` in
   `gemini.ts`, `tools: [{type: "google_search"}]`). Grounding can't be
   combined with a structured-output schema, so the prompt demands raw JSON
   and `validateEcoEvents` (pure) filters every row (date format, coord
   ranges, http(s) URLs). Fallback: `src/data/events.json`.
3. **Facts → World Bank API** (keyless). Verified indicators:
   `EN.GHG.CO2.PC.CE.AR5`, `EN.GHG.ALL.PC.CE.AR5`, `AG.LND.FRST.ZS` for
   USA + World, most recent non-empty value. `getEnvironmentFacts()` returns
   live facts first, curated EPA/UN list appended for breadth; on fetch
   failure the curated list alone. Consumers: quiz generation + Ask AI
   prompts in `gemini.ts`.

Out of scope (explicitly not chosen): seed data (cities/quizzes/demo users)
stays as-is; static JSONs are kept as fallbacks, not deleted.
