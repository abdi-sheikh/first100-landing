/**
 * Shape of a row in public.blog_posts (Supabase).
 * Keep in sync with the migration in Mumbl Language Portal project xhvhrafkwwmqfuqxvmxa.
 */

export type BlogCategory =
  | 'language-science'
  | 'parenting'
  | 'per-language'
  | 'app-updates'
  | 'expansion'
  | 'institutional';

export type BlogStatus = 'draft' | 'published' | 'archived';

export type BlogJsonLdType = 'Article' | 'FAQPage' | 'HowTo' | 'BlogPosting';

export type BlogTargetProduct = 'first100' | 'mumbl';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  body_md: string;
  category: BlogCategory;
  tags: string[];
  target_products: BlogTargetProduct[];
  seo_title: string | null;
  primary_keyword: string;
  related_keywords: string[];
  research_dimension: number | null;
  research_tier: number | null;
  cta_language: string | null;
  hero_image_url: string | null;
  hero_image_alt: string | null;
  related_slugs: string[];
  author: string;
  status: BlogStatus;
  json_ld_type: BlogJsonLdType;
  pub_date: string | null;
  updated_date: string | null;
  created_at: string;
  updated_at_db: string;
}

export type BlogPostListItem = Omit<BlogPost, 'body_md' | 'related_slugs'>;
