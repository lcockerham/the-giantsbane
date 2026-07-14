/**
 * DEPRECATED — one-time migration tool, no longer part of site infrastructure.
 * The migration has already been run. Kept for anyone forking the repo who
 * still has hotlinked Blogger images and wants to self-host them.
 *
 * Downloads every blogger.googleusercontent.com image referenced in
 * src/content/posts/*.md into src/assets/posts/<post-slug>/, requesting the
 * original (unscaled) resolution, and rewrites the Markdown to a relative
 * path so Astro's content-collection image pipeline can optimize it.
 *
 * Run: node scripts/migrate-images.mjs
 */

import { writeFileSync, readFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = join(__dirname, '..', 'src', 'content', 'posts');
const ASSETS_DIR = join(__dirname, '..', 'src', 'assets', 'posts');

const IMG_RE = /!\[([^\]]*)\]\((https:\/\/blogger\.googleusercontent\.com[^\s)]+)(?:\s+"([^"]*)")?\)/g;

const CONTENT_TYPE_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toOriginalUrl(url) {
  const classic = url.match(
    /^(https:\/\/blogger\.googleusercontent\.com\/img\/b\/[^/]+\/[^/]+)\/(s\d+|w\d+(?:-h\d+)?|h\d+)\/([^/?]+)$/
  );
  if (classic) {
    return { url: `${classic[1]}/s0/${classic[3]}`, rawFilename: classic[3] };
  }
  const proxy = url.match(/^(https:\/\/blogger\.googleusercontent\.com\/img\/a\/[^=]+)=(.*)$/);
  if (proxy) {
    return { url: `${proxy[1]}=s0`, rawFilename: null };
  }
  return { url, rawFilename: null };
}

function sanitize(name) {
  return name
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function slugify(text) {
  const s = sanitize(text);
  return s || 'image';
}

async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentType = res.headers.get('content-type')?.split(';')[0].trim();
  const ext = CONTENT_TYPE_EXT[contentType];
  if (!ext) throw new Error(`Unrecognized content-type: ${contentType}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, ext };
}

async function main() {
  const postFiles = readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  const emptyAlt = [];
  const failures = [];

  for (const postFile of postFiles) {
    const postSlug = postFile.replace(/\.md$/, '');
    const postPath = join(POSTS_DIR, postFile);
    let content = readFileSync(postPath, 'utf8');
    const matches = [...content.matchAll(IMG_RE)];
    if (matches.length === 0) continue;

    const postAssetsDir = join(ASSETS_DIR, postSlug);
    const usedNames = new Set();
    let changed = false;
    let imgIndex = 0;

    for (const match of matches) {
      const [fullMatch, alt, originalUrl, title] = match;
      imgIndex += 1;
      const { url: fetchUrl, rawFilename } = toOriginalUrl(originalUrl);

      let baseName = rawFilename
        ? sanitize(decodeURIComponent(rawFilename))
        : slugify(alt) !== 'image'
          ? slugify(alt)
          : `image-${imgIndex}`;

      let result;
      try {
        result = await downloadImage(fetchUrl);
      } catch (err) {
        console.warn(`  [fallback] ${postFile}: s0 fetch failed (${err.message}), trying original URL`);
        try {
          result = await downloadImage(originalUrl);
        } catch (err2) {
          console.error(`  [FAIL] ${postFile}: ${originalUrl} — ${err2.message}`);
          failed += 1;
          failures.push({ postFile, url: originalUrl, error: err2.message });
          continue;
        }
      }

      let filename = `${baseName}.${result.ext}`;
      let suffix = 2;
      while (usedNames.has(filename)) {
        filename = `${baseName}-${suffix}.${result.ext}`;
        suffix += 1;
      }
      usedNames.add(filename);

      mkdirSync(postAssetsDir, { recursive: true });
      const targetPath = join(postAssetsDir, filename);
      if (existsSync(targetPath)) {
        skipped += 1;
      } else {
        writeFileSync(targetPath, result.buffer);
        downloaded += 1;
      }

      const relPath = relative(POSTS_DIR, targetPath).split('\\').join('/');
      const relativeMarkdownPath = `../../assets/posts/${postSlug}/${filename}`;
      const newImg = title
        ? `![${alt}](${relativeMarkdownPath} "${title}")`
        : `![${alt}](${relativeMarkdownPath})`;
      content = content.replace(fullMatch, newImg);
      changed = true;

      if (!alt) {
        emptyAlt.push({ postFile, targetPath: relative(join(__dirname, '..'), targetPath) });
      }

      await sleep(150);
    }

    if (changed) writeFileSync(postPath, content);
  }

  console.log('\n--- Summary ---');
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Skipped (already present): ${skipped}`);
  console.log(`Failed: ${failed}`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  ${f.postFile}: ${f.url} (${f.error})`);
  }
  if (emptyAlt.length) {
    console.log(`\nEmpty alt text (${emptyAlt.length}) — needs manual review:`);
    for (const e of emptyAlt) console.log(`  ${e.postFile} -> ${e.targetPath}`);
  }
}

main();
