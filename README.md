# The Giantsbane

A static blog for D&D dungeon masters, built with [Astro 5](https://astro.build) and Tailwind CSS, hosted on Cloudflare Workers (static assets).

Live site: **https://thegiantsbane.com**

---

## Stack

| Layer | Tool |
|---|---|
| Framework | Astro 5 (static output) |
| Styling | Tailwind CSS v3 |
| Hosting | Cloudflare Workers + static assets (free tier) |
| Email subscriptions | Buttondown |
| RSS | `@astrojs/rss` |
| Sitemap | `@astrojs/sitemap` |

---

## Local development

```
npm install
npm run dev
```

The dev server starts at `http://localhost:4321` (or the next available port).

Other commands:

```
npm run build     # production build → dist/
npm run preview   # preview the production build locally
```

---

## Writing posts

Posts live in `src/content/posts/` as Markdown files. Filename format: `YYYY-MM-DD-slug.md`.

Every post needs frontmatter:

```yaml
---
title: "Your Post Title"
date: "2026-01-15"
tags:
  - "Campaigns"
  - "Guides"
description: "One-sentence summary shown in post cards and RSS."
draft: false
---

Post body in Markdown...
```

- `draft: true` hides a post from the index, archive, RSS, and sitemap — useful for work in progress.
- Tags are free-form strings. They get their own browseable pages at `/tags/[tag]`.
- `description` is optional but recommended — it feeds the RSS item and the post card excerpt.

---

## Deploying to Cloudflare Workers

The site runs on Cloudflare Workers static assets — **not** Cloudflare Pages (a Pages setup was tried first and didn't work; see `deployments.md` for the full story and troubleshooting runbook).

1. Push your repo to GitHub.
2. In the [Cloudflare dashboard](https://dash.cloudflare.com), create a Worker and connect it to your repo via **Workers Builds** (Worker → Settings → Build).
3. Build settings:
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
4. `wrangler.jsonc` in the repo root tells wrangler the worker name and that `./dist` is served as static assets — update the `name` for your own Worker.
5. Add a custom domain under the Worker's **Settings → Domains & Routes**.
6. Every push to `master` triggers a build and deploy automatically.

Before deploying, update `astro.config.mjs` with your own domain:

```js
export default defineConfig({
  site: 'https://yourdomain.com',
  ...
});
```

Also update `public/robots.txt` to point to your sitemap URL.

---

## Email subscriptions (Buttondown)

The sidebar includes an email signup form wired to [Buttondown](https://buttondown.com) (free up to 100 subscribers). To use your own account:

1. Sign up at `buttondown.com` and choose a username.
2. In `src/components/Sidebar.astro`, replace `lcockerham` with your username in the two places it appears in the form's `action` and `onsubmit` attributes.

---

## Forking this blog with Claude Code

This repo was built and maintained with [Claude Code](https://claude.ai/code). If you want to fork it and build your own blog, Claude Code can handle most of the setup work.

**Prerequisites:** Install Claude Code (`npm install -g @anthropic-ai/claude-code`), then run `claude` inside your forked repo.

Suggested prompts to get started:

```
# After forking and cloning:
"Update the site URL to https://yourdomain.com in astro.config.mjs and robots.txt"

# Personalize the sidebar:
"Update the About section in Sidebar.astro — I've been DMing since 2010 and I write about OSR adventures"

# Replace the DM's Guild links with your own or remove the section entirely:
"Remove the DM's Guild section from the sidebar"

# Wire up your own Buttondown account:
"Replace lcockerham with myusername in the Buttondown subscribe form"

# Change the color scheme:
"The site uses a dark pit/crimson theme. Change the accent color from crimson to gold"

# Import posts from Blogger:
"There's a scripts/import-blogger.mjs file — help me run it against my Blogger export XML"
```

Claude Code can also write new posts if you give it an outline, help you add new sidebar sections, and handle Cloudflare Workers deployment troubleshooting.

### Generating a custom look and feel

Rather than tweaking the existing theme by hand, ask Claude Code to generate several distinct options and let you pick. The key files for visual identity are `src/layouts/BaseLayout.astro` (header, footer, font imports), `src/components/Sidebar.astro`, and the Tailwind color palette in `tailwind.config.*`.

Try prompts like:

```
"Generate three different color palette options for this blog — one warm/earthy,
one dark/moody, one clean/minimal — and show me the Tailwind config for each."

"Redesign the header in BaseLayout.astro three different ways: one with a centered
logo and full-width nav, one with a large hero banner, one compact single-line.
Write each as a separate commented block so I can compare them."

"Propose two alternative sidebar layouts: one that moves tags to a collapsible
section and leads with the subscribe form, one that removes the sidebar entirely
and puts navigation in a top bar."

"Suggest three Google Font pairings that would suit a [medieval / technical / cozy]
blog, and update the font imports and Tailwind font-family config for each."
```

The workflow: ask Claude Code to write the variants, run `npm run dev`, and compare them in your browser. Once you pick one, tell Claude Code to discard the others and clean up.

---

## Image attribution

Posts include official art from D&D books, modules, and Dungeon magazine issues (Wizards of the Coast / Paizo), used to illustrate reviews and guides for those specific products — not sold, not used to promote unrelated content, and not stripped of any logos or trademarks present in the source art. This falls under Wizards' [Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy), which permits incorporating their IP into fan blogs and reviews like this one.

Images are self-hosted in `src/assets/posts/` (migrated from Blogger hotlinks via `scripts/migrate-images.mjs`) rather than linked from their original source, so posts don't break if that source disappears. If you're a rights holder with a concern about a specific image, please open a GitHub issue and it'll be addressed.

---

## Project structure

```
src/
  content/
    posts/          # Markdown blog posts (YYYY-MM-DD-slug.md)
  content.config.ts # Astro content collection schema
  layouts/
    BaseLayout.astro  # Site shell: header, footer, <head>
    PostLayout.astro  # Individual post layout
  pages/
    index.astro       # Homepage (post list + sidebar)
    archive.astro     # Full chronological archive
    tags/             # Tag index and per-tag pages
    posts/[slug].astro # Individual post pages
    rss.xml.ts        # RSS feed endpoint
  components/
    Sidebar.astro     # Right sidebar (subscribe, tags, links)
    PostCard.astro    # Post summary card used on index/archive
  lib/
    series.ts         # Utilities for grouping related posts
public/
  robots.txt
  favicon.svg
  .assetsignore       # Required by Astro 5 build
astro.config.mjs      # Astro config (site URL, integrations)
wrangler.jsonc        # Cloudflare Workers config (worker name, assets dir)
```
