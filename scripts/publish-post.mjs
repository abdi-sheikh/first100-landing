#!/usr/bin/env node
/**
 * Publish a markdown blog post (with frontmatter) to the Supabase `blog_posts` table.
 *
 * Usage:
 *   node scripts/publish-post.mjs <path-to-md> [--draft]
 *
 * Modes:
 *   - If SUPABASE_SERVICE_ROLE_KEY + PUBLIC_SUPABASE_URL are set in the env,
 *     it upserts the row directly via the Supabase REST API.
 *   - Otherwise it writes a ready-to-run `<file>.publish.sql` (idempotent
 *     INSERT ... ON CONFLICT) to execute via the Supabase SQL editor / MCP.
 *
 * Frontmatter keys map 1:1 onto blog_posts columns. `--draft` sets status=draft.
 */
import fs from 'node:fs';
import yaml from 'js-yaml';

const file = process.argv[2];
const asDraft = process.argv.includes('--draft');
if (!file) {
  console.error('usage: node scripts/publish-post.mjs <file.md> [--draft]');
  process.exit(1);
}

const raw = fs.readFileSync(file, 'utf8');
const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
if (!m) { console.error('No YAML frontmatter found in ' + file); process.exit(1); }
const fm = yaml.load(m[1]) || {};
const body = m[2].trim();
const status = asDraft ? 'draft' : 'published';

const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const products = arr(fm.target_products).length ? arr(fm.target_products) : ['first100'];

// --- direct REST upsert if a write key is configured ---
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const URL = process.env.PUBLIC_SUPABASE_URL;
if (KEY && URL) {
  const row = {
    slug: fm.slug, title: fm.title, description: fm.description, body_md: body,
    category: fm.category, tags: arr(fm.tags), target_products: products,
    seo_title: fm.seo_title ?? null, primary_keyword: fm.primary_keyword,
    related_keywords: arr(fm.related_keywords),
    research_dimension: fm.research_dimension ?? null, research_tier: fm.research_tier ?? null,
    cta_language: fm.cta_language ?? null, hero_image_url: fm.hero_image_url ?? null,
    hero_image_alt: fm.hero_image_alt ?? null, related_slugs: arr(fm.related_slugs),
    author: fm.author ?? 'The First100 Team', status,
    json_ld_type: fm.json_ld_type ?? 'Article',
    pub_date: status === 'published' ? new Date().toISOString() : null,
    updated_date: new Date().toISOString(),
  };
  const res = await fetch(`${URL}/rest/v1/blog_posts?on_conflict=slug`, {
    method: 'POST',
    headers: {
      apikey: KEY, Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) { console.error('REST upsert failed', res.status, await res.text()); process.exit(1); }
  console.error(`✓ ${status}: ${fm.slug} (via Supabase REST)`);
  process.exit(0);
}

// --- otherwise emit SQL to run via the Supabase MCP / SQL editor ---
function dq(s, tag = 't') {           // safe Postgres dollar-quoting
  s = String(s);
  let t = tag;
  while (s.includes(`$${t}$`)) t += '_';
  return `$${t}$${s}$${t}$`;
}
const txt = (v) => (v == null ? 'NULL' : dq(v));
const intN = (v) => (v == null ? 'NULL' : parseInt(v, 10));
const arrSql = (v) => `ARRAY[${arr(v).map((x) => dq(x, 'a')).join(', ')}]::text[]`;

const cols = ['slug', 'title', 'description', 'body_md', 'category', 'tags', 'target_products',
  'seo_title', 'primary_keyword', 'related_keywords', 'research_dimension', 'research_tier',
  'cta_language', 'hero_image_url', 'hero_image_alt', 'related_slugs', 'author', 'status',
  'json_ld_type', 'pub_date'];
const vals = [dq(fm.slug, 's'), txt(fm.title), txt(fm.description), dq(body, 'body'), txt(fm.category),
  arrSql(fm.tags), arrSql(products), txt(fm.seo_title), txt(fm.primary_keyword), arrSql(fm.related_keywords),
  intN(fm.research_dimension), intN(fm.research_tier), txt(fm.cta_language), txt(fm.hero_image_url),
  txt(fm.hero_image_alt), arrSql(fm.related_slugs), txt(fm.author ?? 'The First100 Team'),
  dq(status), txt(fm.json_ld_type ?? 'Article'), status === 'published' ? 'now()' : 'NULL'];
const setClause = cols.filter((c) => c !== 'slug').map((c) => `${c}=excluded.${c}`).join(', ');
const sql = `INSERT INTO public.blog_posts (${cols.join(', ')})\nVALUES (${vals.join(', ')})\nON CONFLICT (slug) DO UPDATE SET ${setClause}, updated_date=now(), updated_at_db=now();\n`;

const out = file.replace(/\.md$/, '') + '.publish.sql';
fs.writeFileSync(out, sql);
console.error(`No SUPABASE_SERVICE_ROLE_KEY set — wrote SQL to:\n  ${out}`);
console.error(`Run it via the Supabase SQL editor / MCP to ${status} "${fm.slug}".`);
console.log(out);
