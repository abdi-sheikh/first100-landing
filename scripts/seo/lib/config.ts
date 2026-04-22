import 'dotenv/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SEO_ROOT = resolve(__dirname, '..');

export const paths = {
  seoRoot: SEO_ROOT,
  data: resolve(SEO_ROOT, 'data'),
  output: resolve(SEO_ROOT, 'output'),
  database: resolve(SEO_ROOT, 'data', 'keywords.db'),
  matrixCsv: resolve(SEO_ROOT, 'output', 'content-matrix.csv'),
  matrixMd: resolve(SEO_ROOT, 'output', 'content-matrix.md'),
};

export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const env = {
  get openaiKey() { return requireEnv('OPENAI_API_KEY'); },
  get keywordsEverywhereKey() { return requireEnv('KEYWORDS_EVERYWHERE_API_KEY'); },
};

export function isMainModule(importMetaUrl: string): boolean {
  const arg = process.argv[1];
  if (!arg) return false;
  try {
    return importMetaUrl === pathToFileURL(resolve(arg)).href;
  } catch {
    return false;
  }
}
