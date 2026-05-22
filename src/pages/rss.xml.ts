import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const sorted = posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: 'The Giantsbane',
    description: "A D&D dungeon master's resource blog by Lucas Cockerham.",
    site: context.site!,
    items: sorted.map((post) => {
      const slug = post.id.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
      return {
        title: post.data.title,
        pubDate: post.data.date,
        description: post.data.description,
        link: `/posts/${slug}`,
      };
    }),
  });
}
