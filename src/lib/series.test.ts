import { describe, expect, it } from 'vitest';
import type { CollectionEntry } from 'astro:content';
import { getSeriesNav, postSlug } from './series';

function post(id: string, date: string): CollectionEntry<'posts'> {
  return {
    id,
    data: { date: new Date(date) },
  } as unknown as CollectionEntry<'posts'>;
}

describe('postSlug', () => {
  it('strips the .md extension and the leading yyyy-mm-dd date prefix', () => {
    // Routing and series matching both key off this slug, so it must match
    // the slug Astro derives for the post's actual URL.
    expect(postSlug(post('2024-03-01-whispering-cairn.md', '2024-03-01'))).toBe(
      'whispering-cairn',
    );
  });

  it('leaves a slug with no date prefix untouched', () => {
    expect(
      postSlug(post('my-favorite-dwarven-forge-pieces.md', '2024-01-01')),
    ).toBe('my-favorite-dwarven-forge-pieces');
  });
});

describe('getSeriesNav', () => {
  it('returns null for a post that belongs to no known series', () => {
    // Prevents rendering a series nav widget on standalone posts.
    const standalone = post(
      '2024-05-01-my-favorite-dwarven-forge-pieces.md',
      '2024-05-01',
    );
    expect(getSeriesNav(standalone, [standalone])).toBeNull();
  });

  it('orders prev/next by publish date, not by the order posts appear in the collection', () => {
    // allPosts commonly arrives in filesystem/collection order, not date
    // order, so nav must re-sort or prev/next links would point the wrong way.
    const first = post('2024-01-01-whispering-cairn-part-1.md', '2024-01-01');
    const second = post('2024-02-01-whispering-cairn-part-2.md', '2024-02-01');
    const third = post('2024-03-01-whispering-cairn-part-3.md', '2024-03-01');
    const allPosts = [third, first, second];

    const nav = getSeriesNav(second, allPosts);

    expect(nav?.seriesName).toBe('Age of Worms');
    expect(nav?.prev?.id).toBe(first.id);
    expect(nav?.next?.id).toBe(third.id);
    expect(nav).toMatchObject({ index: 2, total: 3 });
  });

  it('gives a series of one post null prev and next', () => {
    const only = post('2024-01-01-spelljammer-academy-intro.md', '2024-01-01');
    const nav = getSeriesNav(only, [only]);

    expect(nav).toMatchObject({
      seriesName: 'Spelljammer Academy',
      index: 1,
      total: 1,
    });
    expect(nav?.prev).toBeNull();
    expect(nav?.next).toBeNull();
  });

  it('excludes posts matched by a series exclude() pattern from that series nav', () => {
    // The DM's Guild re-release shares the Planescape slug prefix but is a
    // separate, non-serialized post — it must not get pulled into series nav.
    const seriesPost = post(
      '2024-01-01-planescape-turn-of-fortune-s-wheel-part-1.md',
      '2024-01-01',
    );
    const excluded = post(
      '2024-06-01-planescape-turn-of-fortune-s-wheel-released-on-dm-s-guild.md',
      '2024-06-01',
    );

    expect(getSeriesNav(excluded, [seriesPost, excluded])).toBeNull();

    const nav = getSeriesNav(seriesPost, [seriesPost, excluded]);
    expect(nav?.total).toBe(1);
  });
});
