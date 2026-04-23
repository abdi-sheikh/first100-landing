import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeStringify from 'rehype-stringify';
import readingTime from 'reading-time';

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeSlug)
  .use(rehypeAutolinkHeadings, {
    behavior: 'append',
    properties: { className: ['heading-anchor'], ariaHidden: 'true', tabIndex: -1 },
    content: { type: 'text', value: '#' },
  })
  .use(rehypeStringify);

export async function renderMarkdown(md: string): Promise<string> {
  const file = await processor.process(md);
  return String(file);
}

export function computeReadingTime(md: string): { minutes: number; text: string; words: number } {
  const rt = readingTime(md);
  return { minutes: Math.ceil(rt.minutes), text: rt.text, words: rt.words };
}

export interface Heading {
  depth: number;
  text: string;
  slug: string;
}

const HEADING_RE = /^(#{2,3})\s+(.+?)\s*$/gm;

export function extractHeadings(md: string): Heading[] {
  const headings: Heading[] = [];
  for (const match of md.matchAll(HEADING_RE)) {
    const depth = match[1].length;
    const text = match[2].trim();
    const slug = slugify(text);
    headings.push({ depth, text, slug });
  }
  return headings;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
