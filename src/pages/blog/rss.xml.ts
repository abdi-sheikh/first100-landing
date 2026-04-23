import rss from '@astrojs/rss';
import { listPublishedPosts } from '../../lib/blog/posts';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await listPublishedPosts('first100');
  return rss({
    title: 'First 100 — Blog',
    description: 'Language development, parenting, and the science of how kids learn words.',
    site: context.site ?? 'https://www.first100.org',
    items: posts.map((post) => ({
      title: post.title,
      description: post.description,
      link: `/blog/${post.slug}`,
      pubDate: post.pub_date ? new Date(post.pub_date) : undefined,
      categories: post.tags,
      author: post.author,
    })),
    customData: `<language>en-us</language>`,
  });
}
