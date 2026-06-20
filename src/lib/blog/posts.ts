import { getSupabase } from '../supabase';
import type { BlogPost, BlogPostListItem, BlogCategory, BlogTargetProduct } from './types';

const TABLE = 'blog_posts';

/**
 * Canonical language of a post is its `cta_language` slug (matches the slugs in
 * languages.json and the /l/[slug] route). A null/empty value means the post is
 * language-agnostic (a shared/pillar piece, e.g. general parenting science).
 */
export function getPostLanguage(
  post: Pick<BlogPost, 'cta_language'> | Pick<BlogPostListItem, 'cta_language'>,
): string | null {
  const slug = post.cta_language?.trim();
  return slug ? slug : null;
}

const LIST_COLUMNS = [
  'id',
  'slug',
  'title',
  'description',
  'category',
  'tags',
  'target_products',
  'seo_title',
  'primary_keyword',
  'related_keywords',
  'research_dimension',
  'research_tier',
  'cta_language',
  'hero_image_url',
  'hero_image_alt',
  'author',
  'status',
  'json_ld_type',
  'pub_date',
  'updated_date',
  'created_at',
  'updated_at_db',
].join(',');

export async function listPublishedPosts(
  product: BlogTargetProduct = 'first100',
): Promise<BlogPostListItem[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(LIST_COLUMNS)
    .eq('status', 'published')
    .contains('target_products', [product])
    .order('pub_date', { ascending: false });
  if (error) throw new Error(`listPublishedPosts failed: ${error.message}`);
  return (data ?? []) as unknown as BlogPostListItem[];
}

export async function listPostsByCategory(
  category: BlogCategory,
  product: BlogTargetProduct = 'first100',
): Promise<BlogPostListItem[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(LIST_COLUMNS)
    .eq('status', 'published')
    .eq('category', category)
    .contains('target_products', [product])
    .order('pub_date', { ascending: false });
  if (error) throw new Error(`listPostsByCategory(${category}) failed: ${error.message}`);
  return (data ?? []) as unknown as BlogPostListItem[];
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw new Error(`getPostBySlug(${slug}) failed: ${error.message}`);
  return (data as BlogPost | null) ?? null;
}

/**
 * Published posts for a given language (by cta_language slug), newest first.
 * Used by the per-language app page (/l/[slug]) "Resources" block.
 */
export async function listPostsByLanguage(
  languageSlug: string,
  product: BlogTargetProduct = 'first100',
): Promise<BlogPostListItem[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select(LIST_COLUMNS)
    .eq('status', 'published')
    .eq('cta_language', languageSlug)
    .contains('target_products', [product])
    .order('pub_date', { ascending: false });
  if (error) throw new Error(`listPostsByLanguage(${languageSlug}) failed: ${error.message}`);
  return (data ?? []) as unknown as BlogPostListItem[];
}

/**
 * Related posts for a blog post, ranked for topic-cluster interlinking:
 *   1. explicit `related_slugs` (curated cluster siblings)
 *   2. same language (cta_language)
 *   3. same category
 *   4. shared tags
 * Excludes the post itself and dedupes. Returns at most `limit` items.
 */
export async function getRelatedPosts(
  post: BlogPost,
  product: BlogTargetProduct = 'first100',
  limit = 5,
): Promise<BlogPostListItem[]> {
  const all = await listPublishedPosts(product);
  const candidates = all.filter((p) => p.slug !== post.slug);

  const language = getPostLanguage(post);
  const relatedSet = new Set(post.related_slugs ?? []);
  const tagSet = new Set((post.tags ?? []).map((t) => t.toLowerCase()));

  const score = (p: BlogPostListItem): number => {
    let s = 0;
    if (relatedSet.has(p.slug)) s += 100;
    if (language && getPostLanguage(p) === language) s += 50;
    if (p.category === post.category) s += 10;
    const shared = (p.tags ?? []).filter((t) => tagSet.has(t.toLowerCase())).length;
    s += shared;
    return s;
  };

  return candidates
    .map((p) => ({ p, s: score(p) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ p }) => p);
}

export async function getAllCategoriesInUse(
  product: BlogTargetProduct = 'first100',
): Promise<BlogCategory[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('category')
    .eq('status', 'published')
    .contains('target_products', [product]);
  if (error) throw new Error(`getAllCategoriesInUse failed: ${error.message}`);
  const uniq = new Set<BlogCategory>();
  for (const row of data ?? []) uniq.add((row as { category: BlogCategory }).category);
  return Array.from(uniq).sort();
}
