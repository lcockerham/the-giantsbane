# Repository Audit — The Giantsbane

*Audit date: 2026-06-10. Analysis-only pass; no code was modified. Owner decisions on the open questions are recorded in the Decisions section at the end.*

## Executive Summary

**Overall health: B.** This is a clean, well-built Astro 5 static blog that does almost everything right for its size: strict TypeScript, schema-validated content collections, consistent draft filtering, working RSS/sitemap/SEO, and an unusually good README. The production build passes (84 pages, ~6s) and the dependency footprint is tiny.

**Top 3 risks:**

1. Every post image is hot-linked to Blogger's CDN, so the entire site's imagery depends on an old Blogspot blog continuing to exist.
2. There is no CI or content linting, which already let a broken empty link (`[here]()`) ship to production in the published Hall of Harsh Reflections review.
3. Date rendering is timezone-dependent, so the same commit shows different dates in local dev (US timezones) versus the Cloudflare build.

**Top 3 opportunities:**

1. A tiny content-lint script in CI would prevent the entire class of incidents that has already occurred.
2. Self-hosting images removes the single biggest durability threat.
3. Centralizing the slug/tag-URL logic (currently copy-pasted in 4–5 places) makes the planned typo-redirect work safe to do.

---

## Repo Map

**Purpose:** Personal D&D dungeon-master blog (thegiantsbane.com), migrated from Blogger. 70 Markdown posts, actively written. Maturity: small production site, solo-maintained, deployed via Cloudflare Pages on push to `master`.

**Stack:** Astro 5.18 (static output) · Tailwind CSS v3 + typography plugin · TypeScript (strict) · Cloudflare Pages · Buttondown (email) · no test framework, no CI, no linter.

**Architecture:** Classic Astro content-collection blog. `src/content/posts/*.md` → zod schema in `src/content.config.ts` → pages query via `getCollection` with a `!data.draft` filter. One layout pair (`BaseLayout` shell, `PostLayout` article), two components (`PostCard`, `Sidebar`), one utility module (`src/lib/series.ts` for prev/next navigation within post series, matched by slug prefix).

| Path | Role |
|---|---|
| `src/content/posts/` | 70 Markdown posts, `YYYY-MM-DD-slug.md` |
| `src/pages/` | index, archive, tags index, `tags/[tag]`, `posts/[slug]`, `rss.xml.ts` |
| `src/lib/series.ts` | Series registry + slug helper + prev/next nav |
| `scripts/import-blogger.mjs` | One-time Blogger migration script (already run) |
| `public/` | `robots.txt`, `.assetsignore` |
| `.replit`, `replit.nix` | Leftover Replit deploy config (dead — see Decisions) |

**Surprises:** the series registry deliberately matches the misspelled slug `whipering-cairn` (`src/lib/series.ts:37`) to keep a typo'd published URL working — a sensible hack, but a sign the typo debt needs a real redirect solution. At audit time, two work-in-progress posts sat uncommitted in the working tree with `<!-- TODO: add link -->` placeholders and no `draft: true`.

---

## Audit Report

### Architecture & design

**A1 — Slug derivation is duplicated in five places.** *(fact, Medium)*
`series.ts:53-55` defines `postSlug()`, but the identical regex chain (`.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '')`) is re-implemented inline at `src/components/PostCard.astro:17`, `src/pages/archive.astro:29`, `src/pages/rss.xml.ts:14`, and `src/pages/posts/[slug].astro:10`. Consequence: any change to slug logic (e.g., for the planned typo renames) must be made in five places, and a missed one silently breaks links between pages, RSS, and routes.

**A2 — Tag URL construction (`/tags/${tag.toLowerCase()}`) is duplicated and not URL-encoded.** *(fact, Low)*
Appears in `PostLayout.astro:29,101`, `PostCard.astro:43`, `Sidebar.astro:57`, `tags/index.astro:25`. All current tags are single CamelCase words (16 unique tags verified), so nothing is broken today — but the first tag containing a space or `&` produces an invalid unencoded URL in four places at once. Tag-counting logic is also duplicated between `Sidebar.astro:6-11` and `tags/index.astro:8-13`.

**A3 — The series registry has no entry for the ongoing Age of Worms guide posts.** *(fact, Medium for site UX)*
`series.ts:9-43` covers Whispering Cairn and Three Faces of Evil, but `guide-to-encounter-at-blackwall-keep`, `guide-to-running-hall-of-harsh-reflections`, and `running-the-age-of-worms-adventure-path` match no series — so the newest posts in the most active series get no prev/next navigation, while the older ones do.

### Code quality

**Q1 — Date rendering is timezone-dependent (off-by-one risk).** *(fact, Medium)*
`z.coerce.date()` (`content.config.ts:7`) parses `"2026-06-08"` as **UTC midnight**. But `toLocaleDateString('en-US', …)` at `PostLayout.astro:15`, `PostCard.astro:11`, `archive.astro:30`, and `getFullYear()` at `archive.astro:10` all use the **build machine's local timezone**. On US-timezone machines, every post date renders one day early in `npm run dev`; production is only correct because Cloudflare's build container runs in UTC. The archive's year-grouping has the same flaw — a January 1 post would file under the previous year locally. Fix: `timeZone: 'UTC'` on the format calls and `getUTCFullYear()`.

**Q2 — A published post contains an empty link.** *(fact, High for a content site)*
`src/content/posts/2026-06-08-review-of-hall-of-harsh-reflections-from-the-age-of-worms-adventure-path.md:11`: `[here]()` — committed and live on production. It renders as `<a href="">here</a>`, which links the page to itself. The two **uncommitted** drafts contain three more (`…guide-to-running-hall-of-harsh-reflections.md:12`, `…my-favorite-dwarven-forge-pieces.md:17,25`) and have **no `draft: true`**, so committing them as-is publishes two incomplete posts immediately.

**Q3 — RSS items have no description fallback.** *(fact, Low)*
`rss.xml.ts:18` passes `post.data.description`, which is optional — older imported posts without one produce RSS items with empty descriptions. `PostCard.astro:19-34` already has an `excerptFromBody()` fallback, but it lives inside the component where RSS can't reuse it (related to A1's duplication theme).

### Security

**S1 — `npm audit`: 2 advisories against astro 5.18.1** (moderate XSS in `define:vars`, GHSA-j687-52p2-xcff; low server-island replay, GHSA-xr5h-phrj-8vxv). *(fact, Low effective risk)* `define:vars` is used nowhere in `src/`, and the site is fully static with no server islands, so neither code path is reachable. The audit-suggested fix is astro@6 (breaking) — not worth it for an unreachable vulnerability; note it for the eventual Astro 6 migration.

Otherwise healthy: no secrets, no user input handled server-side, external links carry `rel="noopener"`, and the only form posts directly to Buttondown.

### Testing

**T1 — Zero tests, zero automated checks of any kind.** *(fact, Medium)*
For a content blog, unit-test coverage is mostly low-value — but Q2 proves the gap is real: an empty link shipped to production with no machine in the path that could have caught it. The high-value checks are cheap: a content-lint script (empty `[]()` links, leftover `TODO` comments, missing descriptions, empty alt text) and a CI build. `series.ts` is the one module with enough logic to merit a real unit test (the exclude rules and the typo-matching are easy to silently break).

### Performance

Healthy: fully static output, Google Fonts with `preconnect`, no client-side JS at all. One note: the Blogger-hosted images (see D1) ship with no width/height attributes — minor CLS, fixed for free by the self-hosting work below.

### Dependencies

**D1 — All post images hot-link to `blogger.googleusercontent.com`.** *(fact, High — the most important finding in this audit)*
Every image across the imported posts (28+ verified, e.g. `2023-02-19-review-of-princes-of-the-apocalypse.md:9`) points at Blogger's CDN, tied to the old Blogspot blog. If that blog is ever deleted, made private, or Google changes CDN policy, **every image on the site breaks at once**, with no local copies in the repo. This is a single external point of failure for the site's entire visual content.

**D2 — Minor hygiene items.** *(facts, Low)* `turndown` + `scripts/import-blogger.mjs` are one-time migration artifacts still in the dependency tree; `.replit`/`replit.nix` are dead config now that Cloudflare hosts; no `engines` field or `.nvmrc` pins Node (local is v22 — Cloudflare's default may drift); `@astrojs/tailwind` + Tailwind v3 are one major version behind (Astro now recommends `@tailwindcss/vite` — defer, not urgent).

### DevEx & operations

**O1 — No CI.** *(fact, Medium)*
No `.github/` exists. The repo uses PRs (see merge commit `9d97e9f`), but nothing validates a PR before merge — the first build of any change is Cloudflare's production deploy. A frontmatter typo (`date: 2026-13-01`) merges green and then fails the deploy. A 15-line GitHub Actions workflow closes this.

**O2 — No linting or formatting enforcement** (no ESLint/Prettier/`astro check`). *(fact, Low)* The code is currently consistent because one person writes it; this matters mainly because the README invites forks.

### Documentation

**Doc1 — README is excellent and accurate** — its claims were verified against the code (build commands, frontmatter contract, draft behavior, project structure). This dimension is healthy.

**Doc2 — No LICENSE file, but the README explicitly invites forking** (`README.md:98-150`). *(fact, Medium-low)* Without a license, the legal default is all-rights-reserved — the forking workflow the README advertises isn't actually permitted. **Decision: MIT (see Decisions).**

### Strengths (preserve these)

- **Consistent draft filtering** — `!data.draft` appears at every one of the five `getCollection` call sites; no leak path.
- **Schema-validated frontmatter** with sensible defaults (`content.config.ts`) — bad posts fail the build instead of rendering wrong.
- **Strict tsconfig** (`astro/tsconfigs/strict`) and typed component props throughout.
- **SEO done properly**: canonical URLs, per-page descriptions, sitemap + robots.txt + RSS autodiscovery.
- **`series.ts` is genuinely good design** — declarative registry, pure function, easy to test, easy to extend.
- **README** is the best part of the repo — accurate, onboarding-complete, and honest about its own setup.
- Zero client-side JavaScript; the site is as fast and robust as a website can be.

---

## Improvement Strategy

**Theme 1: No machine checks anything before production.** (explains T1, O1, Q2, and the empty links in the drafts)
*Target state:* every push runs build + content lint in CI; `master` cannot receive a post with empty links, TODO comments, or invalid frontmatter. *Principle:* for a content site, the "test suite" is a content linter — it catches the failure mode that actually happens.

**Theme 2: The site's images don't belong to the site.** (D1)
*Target state:* all images live in the repo (`src/assets/` with Astro's image optimization, or `public/images/`), and the Blogger blog can disappear without consequence. *Principle:* a static site's durability promise is broken if its assets live on someone else's deprecation schedule.

**Theme 3: Content-derivation logic is scattered.** (A1, A2, Q3)
*Target state:* `src/lib/posts.ts` (or expanded `series.ts`) owns `postSlug`, `tagUrl`, `excerpt`; pages and RSS import them. *Principle:* the slug is the site's URL contract — exactly one function should define it, especially before doing redirect/rename work.

**Theme 4: Environment-dependent rendering.** (Q1)
*Target state:* dates render identically in UTC everywhere; `npm run dev` on any machine matches production. *Principle:* builds should be deterministic functions of the repo.

**Explicitly NOT recommended:** Astro 6 / Tailwind 4 migrations (breaking, zero current payoff — the audit findings they'd fix are unreachable code paths); a JS test framework with component tests (one `series.ts` test file via `node --test` or vitest is enough); renaming the typo'd post files *without* redirects (breaks inbound links and SEO — do it only as part of Task 5); enterprise observability of any kind (Cloudflare's deploy log is adequate for this maturity).

**"Done" looks like:** CI badge green on every PR; content lint passing with zero empty links/TODOs in committed posts; zero images served from `blogger.googleusercontent.com`; dates identical between local dev and production; an MIT LICENSE file resolving the fork invitation.

---

## Task Plan

### Quick wins (do immediately — all S, all low-risk)

| # | Task | Why now |
|---|---|---|
| QW1 | Fix the live empty link in the published Hall of Harsh Reflections review (line 11) — point it at the guide post or cut the sentence | It's broken in production today |
| QW2 | Add `draft: true` to the two uncommitted WIP posts before they're ever committed | One `git add` away from publishing incomplete posts |
| QW3 | Add `timeZone: 'UTC'` to the three `toLocaleDateString` calls + `getUTCFullYear()` in archive | 4-line fix, removes a whole bug class |
| QW4 | Add a single ongoing **"Age of Worms"** series entry to the `SERIES` registry covering reviews and guides (per decision) | Restores series nav on the newest content |
| QW5 | Add an **MIT** LICENSE file (per decision) | README currently invites forks nobody may legally make |
| QW6 | Delete `.replit` and `replit.nix` (per decision) | Dead config; Cloudflare is the only deploy target |
| QW7 | Delete the local root-level screenshots (`t1.png`–`t5.png`, `final-*.png`, `home-page.png`, `post-page.png`, `tags-page.png`) (per decision) | Gitignored local clutter from a finished design session |

### Milestone 0 — Safety net

**Task 1: GitHub Actions CI — build on every PR and push.**
Workflow: checkout → setup-node (pin 22) → `npm ci` → `npm run build`. Add `engines: { "node": ">=22" }` to package.json while in there.
*Files:* `.github/workflows/ci.yml`, `package.json`. *Accept:* a PR with invalid frontmatter shows a red check before merge. *Effort:* S. *Risk:* none. *Deps:* none.

**Task 2: Content lint script (`scripts/lint-content.mjs`, wired into CI as `npm run lint:content`).**
Checks each post for: empty markdown links `]()`, leftover `<!-- TODO` comments in non-draft posts, missing `description`, empty image alt text (warn-only initially, error once Task 7 completes).
*Accept:* running it against the pre-quick-win state fails on the committed review post (QW1) and the two drafts; passes after quick wins. *Effort:* S–M. *Risk:* none. *Deps:* Task 1.

### Milestone 1 — Critical fixes

**Task 3: Self-host all post images.** *(the highest-value task in this plan)*
Script downloads every `blogger.googleusercontent.com` URL referenced in posts to `src/assets/posts/<post-slug>/`, rewrites the markdown references, and lets Astro's built-in image pipeline handle optimization and dimensions (fixes CLS too). Keep the originals' display sizes (the `/s320/`-style URL params encode width).
*Files:* all ~28 posts with images, new `src/assets/posts/` tree. *Accept:* `grep blogger.googleusercontent` over `src/` and `dist/` returns nothing; visual spot-check of 5 posts. *Effort:* M–L. *Risk:* Medium (mass rewrite of published content — do behind a PR with the CI from M0, and eyeball the Cloudflare preview deploy). *Deps:* Tasks 1–2.

*Implementation sketch:* (1) grep all image URLs → manifest of `{post, url, alt}`; (2) fetch each (handle the `%20` filenames); (3) rewrite refs to relative paths next to content — relative image paths work natively in Astro 5 markdown collections; (4) this is the natural moment to write the 28 missing alt texts since every image gets looked at anyway (folds in the old backlog item from the formatting-cleanup session). Gotcha: a couple of posts have image refs with trailing whitespace inside the parens (e.g. `…behold-h-catha….md:10`) — verify each rewritten link renders.

### Milestone 2 — High-leverage improvements

**Task 4: Centralize post utilities.**
Use `postSlug` at all five call sites; add `tagUrl(tag)` (with `encodeURIComponent`) and move `excerptFromBody` into `src/lib/`; use it as the RSS description fallback.
*Files:* `series.ts` (or new `lib/posts.ts`), `PostCard.astro`, `archive.astro`, `rss.xml.ts`, `posts/[slug].astro`, `PostLayout.astro`, `Sidebar.astro`, `tags/index.astro`. *Accept:* the slug regex exists in exactly one file; built `dist/` URLs are byte-identical before/after (diff the sitemap). *Effort:* M. *Risk:* Low-medium (URL regressions — the sitemap diff is the guard). *Deps:* Task 1.

*Implementation sketch:* do it as a pure refactor PR with zero behavior change first (sitemap diff must be empty), then a second tiny PR for the RSS fallback and URL-encoding (sitemap diff still empty; RSS gains descriptions).

**Task 5: Redirects + filename typo fixes.**
Add a Cloudflare Pages `public/_redirects` file mapping `/posts/review-of-the-whipering-cairn-…` → corrected slug (301), plus `essientials` and `Maerlon`; rename the three files; remove the `whipering-cairn` hack from `series.ts:37`.
*Accept:* old URLs 301 to new ones on the preview deploy; series nav still groups Whispering Cairn posts. *Effort:* M. *Risk:* Medium (SEO — 301s mitigate). *Deps:* Task 4 (single slug function makes this safe).

*Implementation sketch:* Cloudflare Pages reads `_redirects` from the build output, so put it in `public/`. One line per mapping, `301`. Gotcha: the typo'd slugs are also referenced by inbound links *within other posts* — grep `src/content` for the old slugs and update those too (consider adding a dead-internal-link check to the Task 2 linter).

**Task 6: Unit tests for `series.ts`** (node:test or vitest, run in CI). Cover: post matches series, exclude rule, ordering by date, first/last have null prev/next, non-series post returns null. *Effort:* S. *Risk:* none. *Deps:* Task 1.

### Milestone 3 — Quality & polish

| Task | Effort | Notes |
|---|---|---|
| 7. Alt text for remaining images | M | Mostly folded into Task 3 |
| 8. Mark `scripts/import-blogger.mjs` as deprecated (per decision) | S | Keep the script for fork users; add a prominent header comment ("one-time migration tool, no longer part of site infrastructure") and note the same in the README's fork section. Optionally move `turndown` out of devDeps with an install hint in the script header. |
| 9. Prettier + `astro check` in CI | S–M | Only valuable if forks/contributors materialize |
| 10. Astro 6 / Tailwind 4 migration | XL | Defer until something forces it; clears the audit advisories |

---

## Decisions (resolved 2026-06-10)

The audit's open questions were answered by the owner:

1. **License:** MIT, for the whole repo. → QW5.
2. **Replit:** dead — remove `.replit`, `replit.nix`, and any other Replit references. → QW6.
3. **Series grouping:** one ongoing **"Age of Worms"** series spanning reviews and guides (not per-adventure sub-series). → QW4.
4. **Import script:** keep `scripts/import-blogger.mjs` in case it's useful to someone forking the repo, but mark it clearly as deprecated / no longer part of the site's infrastructure. → Task 8.
5. **Root screenshots:** not needed — delete them locally. → QW7.
