/**
 * One-time migration script: fetches all posts from the Blogger JSON feed
 * and converts them to Markdown files in src/content/posts/.
 *
 * Run: node scripts/import-blogger.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import TurndownService from 'turndown';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = join(__dirname, '..', 'src', 'content', 'posts');
const FEED_BASE = 'https://thegiantsbane.blogspot.com/feeds/posts/default?alt=json&max-results=25';

mkdirSync(POSTS_DIR, { recursive: true });

const td = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
});

// Strip Blogger's inline style attributes and div wrappers
td.addRule('strip-style', {
  filter: (node) => node.nodeName !== '#text' && node.getAttribute?.('style'),
  replacement: (content) => content,
});

async function fetchPage(startIndex) {
  const url = `${FEED_BASE}&start-index=${startIndex}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function slugFromUrl(alternateLinks) {
  const htmlLink = alternateLinks?.find((l) => l.type === 'text/html');
  if (!htmlLink) return null;
  // Extract the last path segment: /YYYY/MM/some-post-title.html -> some-post-title
  const match = htmlLink.href.match(/\/([^/]+)\.html$/);
  return match ? match[1] : null;
}

function extractDescription(htmlContent) {
  // Take the first non-empty paragraph as description
  const match = htmlContent.match(/<p[^>]*>(.*?)<\/p>/si);
  if (!match) return undefined;
  // Strip tags
  const text = match[1].replace(/<[^>]+>/g, '').trim();
  if (!text || text.length < 20) return undefined;
  return text.slice(0, 200) + (text.length > 200 ? '…' : '');
}

function toFrontmatter(fields) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) lines.push(`  - "${item.replace(/"/g, '\\"')}"`);
      }
    } else if (typeof value === 'string') {
      const escaped = value.replace(/"/g, '\\"');
      lines.push(`${key}: "${escaped}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

async function run() {
  let startIndex = 1;
  let totalFetched = 0;
  let totalResults = Infinity;

  while (startIndex <= totalResults) {
    console.log(`Fetching posts ${startIndex}–${startIndex + 24}…`);
    const data = await fetchPage(startIndex);

    const feed = data.feed;
    if (!feed) {
      console.error('Unexpected feed structure', JSON.stringify(data).slice(0, 200));
      break;
    }

    totalResults = parseInt(feed['openSearch$totalResults']?.['$t'] ?? '0', 10);
    const entries = feed.entry ?? [];

    for (const entry of entries) {
      const title = entry.title?.['$t'] ?? 'Untitled';
      const published = entry.published?.['$t'] ?? '';
      const htmlContent = entry.content?.['$t'] ?? '';
      const labels = (entry.category ?? []).map((c) => c.term).filter(Boolean);
      const slug = slugFromUrl(entry.link) ?? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const dateObj = new Date(published);
      const dateStr = dateObj.toISOString().slice(0, 10); // YYYY-MM-DD
      const filename = `${dateStr}-${slug}.md`;
      const filepath = join(POSTS_DIR, filename);

      const description = extractDescription(htmlContent);
      const markdown = td.turndown(htmlContent);

      const frontmatter = toFrontmatter({
        title,
        date: dateStr,
        tags: labels,
        ...(description ? { description } : {}),
      });

      writeFileSync(filepath, `${frontmatter}\n\n${markdown}\n`, 'utf-8');
      console.log(`  ✓ ${filename}`);
      totalFetched++;
    }

    startIndex += 25;

    // Polite delay between requests
    if (startIndex <= totalResults) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`\nDone. Imported ${totalFetched} posts to src/content/posts/`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
