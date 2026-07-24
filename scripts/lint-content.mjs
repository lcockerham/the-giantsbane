#!/usr/bin/env node
// Content linter — run via `npm run lint:content` or in CI.
// Exits non-zero if any errors are found; warnings are printed but don't fail.

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const POSTS_DIR = fileURLToPath(
  new URL('../src/content/posts/', import.meta.url),
);

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
const EMPTY_LINK_RE = /\[[^\]]*\]\(\s*\)/g;
const TODO_COMMENT_RE = /<!--\s*TODO/;
const EMPTY_ALT_RE = /!\[\]\([^)]+\)/g;
const TAGS_BLOCK_RE = /^tags:\s*\r?\n((?:[ \t]+-[^\r\n]*\r?\n?)+)/m;
// Tag pages route via tag.toLowerCase(), so tags must be URL-safe single tokens.
const SAFE_TAG_RE = /^[A-Za-z0-9]+$/;

let errors = 0;
let warnings = 0;

function error(file, msg) {
  console.error(`ERROR  ${file}: ${msg}`);
  errors++;
}

function warn(file, msg) {
  console.warn(`WARN   ${file}: ${msg}`);
  warnings++;
}

const files = readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));

for (const filename of files) {
  const fullPath = join(POSTS_DIR, filename);
  const content = readFileSync(fullPath, 'utf8');
  const match = FRONTMATTER_RE.exec(content);

  if (!match) {
    error(filename, 'could not parse frontmatter');
    continue;
  }

  const frontmatter = match[1];
  const body = match[2];
  const isDraft = /\bdraft:\s*true\b/.test(frontmatter);
  const hasDescription = /\bdescription:/.test(frontmatter);

  if (!isDraft) {
    const emptyLinks = body.match(EMPTY_LINK_RE);
    if (emptyLinks) {
      error(filename, `empty link(s): ${emptyLinks.join(', ')}`);
    }

    if (TODO_COMMENT_RE.test(body)) {
      error(filename, 'contains <!-- TODO comment in published post');
    }

    if (!hasDescription) {
      warn(filename, 'missing description field');
    }
  }

  const emptyAlts = body.match(EMPTY_ALT_RE);
  if (emptyAlts) {
    warn(filename, `image(s) with empty alt text: ${emptyAlts.length} found`);
  }

  const tagsBlock = TAGS_BLOCK_RE.exec(frontmatter);
  if (tagsBlock) {
    const tags = tagsBlock[1]
      .split(/\r?\n/)
      .map((line) =>
        line
          .trim()
          .replace(/^-\s*/, '')
          .replace(/^["']|["']$/g, ''),
      )
      .filter(Boolean);
    for (const tag of tags) {
      if (!SAFE_TAG_RE.test(tag)) {
        error(
          filename,
          `tag "${tag}" is not URL-safe (must match ${SAFE_TAG_RE})`,
        );
      }
    }
  }
}

if (errors > 0) {
  console.error(
    `\n${errors} error(s), ${warnings} warning(s). Fix errors before committing.`,
  );
  process.exit(1);
}

if (warnings > 0) {
  console.warn(`\n0 errors, ${warnings} warning(s).`);
} else {
  console.log('Content lint passed.');
}
