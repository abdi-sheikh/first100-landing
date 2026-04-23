import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/**
 * Returns a Supabase client configured from env vars.
 * Used at build time only — never shipped to the browser.
 *
 * Set in .env (gitignored):
 *   PUBLIC_SUPABASE_URL=https://xhvhrafkwwmqfuqxvmxa.supabase.co
 *   PUBLIC_SUPABASE_ANON_KEY=<anon key>
 *
 * Optional for preview/draft access at build time:
 *   SUPABASE_SERVICE_ROLE_KEY=<service role key>
 */
export function getSupabase(): SupabaseClient {
  if (cached) return cached;

  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('Missing PUBLIC_SUPABASE_URL');
  const key = serviceKey || anonKey;
  if (!key) throw new Error('Missing PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY)');

  cached = createClient(url, key, {
    auth: { persistSession: false },
  });
  return cached;
}
