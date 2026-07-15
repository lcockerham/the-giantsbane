import type { CollectionEntry } from 'astro:content';

interface SeriesDef {
  name: string;
  match: (slug: string) => boolean;
  exclude?: (slug: string) => boolean;
}

const SERIES: SeriesDef[] = [
  {
    name: 'Spelljammer Academy',
    match: (s) => s.startsWith('spelljammer-academy'),
  },
  {
    name: 'How to Choose Your Next Campaign',
    match: (s) => s.startsWith('how-to-choose-your-next'),
  },
  {
    name: 'Light of Xaryxis',
    match: (s) => s.startsWith('guide-to-running-light-of-xaryxis'),
  },
  {
    name: "Planescape: Turn of Fortune's Wheel",
    match: (s) => s.startsWith('planescape-turn-of-fortune-s-wheel'),
    exclude: (s) => s.includes('released-on-dm-s-guild'),
  },
  {
    name: 'D&D Settings 101',
    match: (s) => s.includes('settings-101'),
  },
  {
    name: "Mystery of Maeralon's Tower",
    match: (s) => s.includes('mystery-of-mae'),
  },
  {
    name: 'Age of Worms',
    match: (s) =>
      s.includes('age-of-worms') ||
      s.includes('whispering-cairn') ||
      s.includes('three-faces-of-evil') ||
      s.includes('blackwall-keep') ||
      s.includes('hall-of-harsh-reflections'),
  },
];

export interface SeriesNav {
  seriesName: string;
  prev: CollectionEntry<'posts'> | null;
  next: CollectionEntry<'posts'> | null;
  index: number;
  total: number;
}

export function postSlug(post: CollectionEntry<'posts'>): string {
  return post.id.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
}

export function getSeriesNav(
  post: CollectionEntry<'posts'>,
  allPosts: CollectionEntry<'posts'>[],
): SeriesNav | null {
  const slug = postSlug(post);

  for (const series of SERIES) {
    if (!series.match(slug)) continue;
    if (series.exclude?.(slug)) continue;

    const seriesPosts = allPosts
      .filter((p) => {
        const s = postSlug(p);
        return series.match(s) && !series.exclude?.(s);
      })
      .sort((a, b) => a.data.date.getTime() - b.data.date.getTime());

    const idx = seriesPosts.findIndex((p) => p.id === post.id);
    if (idx === -1) continue;

    return {
      seriesName: series.name,
      prev: idx > 0 ? seriesPosts[idx - 1] : null,
      next: idx < seriesPosts.length - 1 ? seriesPosts[idx + 1] : null,
      index: idx + 1,
      total: seriesPosts.length,
    };
  }

  return null;
}
