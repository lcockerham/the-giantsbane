# Deployments

How thegiantsbane.com gets built and deployed, and how to troubleshoot it.
Last verified working: 2026-06-10.

## Architecture

- **Platform:** Cloudflare **Workers + static assets** (NOT Cloudflare Pages — the account has no Pages projects; don't go looking for one).
- **Worker name:** `the-giantsbane`
- **Account ID:** `b4ea0223b90bf66e759dedecd0ce0aaf`
- **Live domain:** https://thegiantsbane.com
- **Dashboard:** https://dash.cloudflare.com/b4ea0223b90bf66e759dedecd0ce0aaf/workers/services/view/the-giantsbane/production
- **CI:** Cloudflare **Workers Builds**, connected to GitHub repo `lcockerham/the-giantsbane`. Builds run automatically on push.

## How a deploy works

Push to `master` → Workers Builds runs two commands:

1. **Build command:** `npm run build` → Astro generates the static site into `./dist`
2. **Deploy command:** `npx wrangler deploy` → uploads `./dist` as a new version AND promotes it to 100% of production traffic in one step

That's it. There is **no separate "version command"** for production. `wrangler deploy` does upload + promote together.

Pushes to **non-`master` branches** use a second trigger whose deploy command is `npx wrangler versions upload` — this creates a **preview version only** (with a preview URL) and never touches production. This is correct and intentional.

`wrangler deploy` reads `wrangler.jsonc` in the repo root for the worker name and assets directory:

```jsonc
{
  "name": "the-giantsbane",
  "compatibility_date": "2026-06-11",
  "assets": { "directory": "./dist" }
}
```

### Versions vs deployments (the mental model)

- A **version** is an uploaded snapshot of the site. Uploading a version does NOT change what's live.
- A **deployment** points production traffic at a version.
- `wrangler versions upload` = version only (preview). `wrangler deploy` = version + deployment. `wrangler versions deploy` (note: plural "versions") promotes an already-uploaded version.

If the dashboard shows new versions appearing but the "Active deployment" never changes, the deploy command is only uploading versions, not deploying them.

## Build trigger configuration (the part that broke)

Dashboard → the-giantsbane → Settings → Build. Two triggers exist:

| Trigger | Branches | Build command | Deploy command |
|---|---|---|---|
| Deploy default branch | `master` | `npm run build` | `npx wrangler deploy` |
| Deploy non-production branches | `*` except `master` | `npm run build` | `npx wrangler versions upload` |

**Do not change the production deploy command from `npx wrangler deploy`** unless you know exactly why. In particular:

- `npx wrangler version deploy` — invalid (`version` singular doesn't exist); wrangler prints help and the build fails.
- `npx wrangler deployments create` — removed in wrangler v4. **Worse:** wrangler prints the `deployments` help text and **exits 0**, so the build reports "Success: Deploy command completed" while deploying nothing. A green build does not prove a deploy happened.
- `npx wrangler versions upload` — uploads a preview version only; production never updates.

## How to verify a deploy actually went live

1. **Build log** (dashboard → Builds → click the build): the deploy step should end with wrangler's "Deployed the-giantsbane" output and a version ID — not a wall of command help text.
2. **Deployments tab:** the active deployment timestamp should match the build.
3. **Live content check** (decisive): fetch a page and look for content from the new commit. Example used during the 2026-06 incident:

   ```powershell
   (Invoke-WebRequest -Uri "https://thegiantsbane.com/posts/guide-to-running-the-whispering-cairn-part-1/" -UseBasicParsing).Content -match 'Age of Worms &mdash; Part'
   ```

## Troubleshooting toolbox

### Manual deploy from a local machine (fastest unblock)

```powershell
npx wrangler login   # interactive, opens browser
npm run build
npx wrangler deploy
```

This bypasses CI entirely and pushes whatever is in `./dist` live.

### Inspecting state via wrangler

```powershell
npx wrangler deployments list   # what's live and when
npx wrangler versions list      # uploaded versions (including un-deployed previews)
```

### Dashboard API when the dashboard UI won't load

During the 2026-06 incident the dashboard SPA hung on its splash screen indefinitely, but the underlying API worked fine using the browser's logged-in session cookie. From a browser tab on `dash.cloudflare.com`, `fetch('/api/v4/...', {credentials:'include'})` works. Useful endpoints (`{acct}` = account ID above):

- `GET /api/v4/accounts/{acct}/workers/scripts/the-giantsbane/deployments` — deployment history
- `GET /api/v4/accounts/{acct}/workers/scripts/the-giantsbane/versions` — version history; a version's annotations show `workers/triggered_by` (`version_upload` = preview-only upload, the symptom of a misconfigured deploy command)
- `GET /api/v4/accounts/{acct}/workers/services/the-giantsbane` — service info; `default_environment.script_tag` is the `{tag}` for the builds endpoints below
- `GET /api/v4/accounts/{acct}/builds/workers/{tag}/builds?per_page=10` — build history with outcomes and commit hashes
- `GET /api/v4/accounts/{acct}/builds/builds/{build_uuid}/logs` — full build logs
- `GET /api/v4/accounts/{acct}/builds/workers/{tag}/triggers` — build trigger config (deploy commands live here)
- `PATCH /api/v4/accounts/{acct}/builds/triggers/{trigger_uuid}` with body `{"deploy_command": "npx wrangler deploy"}` — edit a trigger
- `POST /api/v4/accounts/{acct}/builds/triggers/{trigger_uuid}/builds` with body `{"branch":"master"}` — manually queue a build (same as dashboard "Retry build")

## Incident log

**2026-06-10/11 — production stuck on stale version `a42acbe4`.** Repo-audit changes (commit `d169f5a`) wouldn't go live despite green builds. Root cause: the production trigger's deploy command had been changed away from `npx wrangler deploy` to a series of broken commands (see table above); builds either failed or "succeeded" while only uploading preview versions. Fix: set the production deploy command back to `npx wrangler deploy` via the triggers API and re-queued a build. Commits `eaff912` and `a98de67` on master are empty "trigger build" commits from this incident — harmless, removable in a future history cleanup if ever desired.

## SEO (unchanged by deploy mechanics)

- Sitemap auto-generated by `@astrojs/sitemap` at `/sitemap-index.xml`
- `public/robots.txt` points crawlers at the sitemap
- Site registered in Google Search Console
- `public/.assetsignore` (empty file) required by the Astro 5.x build
