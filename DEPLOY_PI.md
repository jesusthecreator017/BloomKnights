# Deploying BloomKnights on the Raspberry Pi 5 — runbook for the Pi's Claude

> Paste everything below the line to the Claude Code running on the Raspberry Pi. It is the operator for this deployment. Some steps need the human (Cloudflare dashboard, GitHub tokens) — guide them through those, don't guess secrets.

---

You are deploying **BloomKnights**, a TanStack Start + Bun + Postgres app, onto this Raspberry Pi 5 (ARM64, Linux). It will be served to the public internet through a **Cloudflare Tunnel** on a free **.TECH** domain, and redeploy automatically via a **GitHub Actions self-hosted runner** on this Pi. Everything runs via Docker Compose. Your job is to get it live and verify it, asking the human for the account-level secrets you can't generate.

## Architecture recap
- `compose.prod.yml` runs four services: `db` (Postgres 17, internal only), `migrate` (one-shot: `db:push` + `db:seed`, then exits), `app` (the built Nitro server on port 3000, internal), and `cloudflared` (dials out to Cloudflare, routes the domain to `app:3000`).
- No router ports are opened. Cloudflare terminates HTTPS at its edge and tunnels to the Pi. The home IP is never exposed.
- Secrets live in a local `.env` next to `compose.prod.yml` (for manual runs) and in GitHub Actions secrets (for auto-deploy). Never commit `.env`.

## Step 0 — Prereqs (detect, install only what's missing)
1. Confirm arch is `aarch64`/ARM64 (`uname -m`) and you have `sudo`.
2. Ensure **Docker Engine + Compose plugin** are installed and the daemon runs: `docker version`, `docker compose version`. If missing, install via `curl -fsSL https://get.docker.com | sh` and add the user to the `docker` group (`sudo usermod -aG docker $USER`, then re-login).
3. Ensure `git` and `openssl` are present.

## Step 1 — Get the code
```bash
git clone https://github.com/jesusthecreator017/BloomKnights.git ~/bloomknights
cd ~/bloomknights
```
(If already cloned, `git pull`.)

## Step 2 — Cloudflare Tunnel + the .TECH domain (human-assisted)
Explain these to the human and wait for the values:
1. **Claim the .TECH domain** via the GitHub Student Developer Pack (education.github.com/pack → .TECH). Pick e.g. `bloomknights.tech`.
2. **Add the domain to Cloudflare** (free plan): create a Cloudflare account → Add a site → follow the prompt to change the domain's **nameservers** at the .TECH registrar to the two Cloudflare nameservers. Wait for it to go "Active" (can take a bit).
3. **Create a Tunnel**: Cloudflare **Zero Trust** dashboard → Networks → Tunnels → Create a tunnel → **Cloudflared** → name it (e.g. `bloomknights`) → copy the **tunnel token** (the long string in the `--token` install command). This is `TUNNEL_TOKEN`.
4. **Add a public hostname** to that tunnel: Hostname = your domain (e.g. `bloomknights.tech`, and optionally `www`), Service = **HTTP** → `app:3000`. (It's `app:3000`, not localhost, because cloudflared runs in the same compose network.)

## Step 3 — Create `.env`
```bash
cp .env.production.example .env
```
Edit `.env` and set:
- `BETTER_AUTH_SECRET` → generate: `openssl rand -base64 32`
- `BETTER_AUTH_URL` → your public URL, e.g. `https://bloomknights.tech` (no trailing slash)
- `TUNNEL_TOKEN` → the token from Step 2.3

Leave the `DATABASE_URL`/`POSTGRES_*` defaults (they're internal to the compose network).

## Step 4 — Bring the stack up
```bash
docker compose -f compose.prod.yml up -d --build
```
This builds the ARM image natively (a few minutes the first time), runs migrations + seed, starts the app, and connects the tunnel. Check:
```bash
docker compose -f compose.prod.yml ps          # db healthy, migrate exited 0, app + cloudflared up
docker compose -f compose.prod.yml logs app | tail -20
docker compose -f compose.prod.yml logs cloudflared | tail -20   # should show a registered connection
```

## Step 5 — Verify end to end
```bash
# app reachable inside the network
docker compose -f compose.prod.yml exec app sh -c 'wget -qO- http://localhost:3000/api/quizzes | head -c 200'
```
Then from any browser, hit `https://bloomknights.tech`:
- Home, `/map`, `/act` load over HTTPS (padlock).
- `https://bloomknights.tech/api/air-quality?lat=25.76&lng=-80.19` returns JSON.
- Sign up, take a quiz, check `/api/leaderboard` — auth cookies work over the real domain.

## Step 6 — Auto-deploy (GitHub Actions self-hosted runner)
1. On GitHub: repo → **Settings → Actions → Runners → New self-hosted runner** → Linux / ARM64. It shows a token; run the given `./config.sh --url ... --token ...` on the Pi in e.g. `~/actions-runner`.
2. Install it as a service so it survives reboots: `sudo ./svc.sh install && sudo ./svc.sh start`.
3. Make sure the runner user is in the `docker` group.
4. On GitHub: repo → **Settings → Secrets and variables → Actions** → add secrets **`BETTER_AUTH_SECRET`**, **`BETTER_AUTH_URL`**, **`TUNNEL_TOKEN`** (same values as `.env`). The `deploy.yml` workflow writes `.env` from these on each run.
5. Test: push a trivial commit to `main` (or run the **Deploy to Pi** workflow via "Run workflow"). It should `docker compose ... up -d --build` and the site updates. The Postgres volume persists across deploys (fixed compose project name `bloomknights`).

## Operational notes
- **Update manually:** `cd ~/bloomknights && git pull && docker compose -f compose.prod.yml up -d --build`.
- **Logs:** `docker compose -f compose.prod.yml logs -f app`.
- **DB shell:** `docker compose -f compose.prod.yml exec db psql -U bloom -d bloomknights`.
- **Caching/rate-limiting are in-memory** and reset when the `app` container restarts — expected on a single instance.
- The `migrate` service re-runs `db:push` (idempotent) and `db:seed` (re-seeds static quiz content) on every deploy; user accounts and quiz attempts are preserved.
- If the app image fails to start under `bun`, switch the runtime `CMD` in the `Dockerfile` to a Node base image running `node .output/server/index.mjs` (the Nitro output is a standard Node server) — but try `bun` first.
