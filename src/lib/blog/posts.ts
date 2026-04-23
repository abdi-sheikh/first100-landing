import { getSupabase } from '../supabase';
import type { BlogPost, BlogPostListItem, BlogCategory, BlogTargetProduct } from './types';

const TABLE = 'blog_posts';

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
