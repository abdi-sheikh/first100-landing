import { request } from 'undici';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { paths, env } from '../lib/config.js';
import { openCache, getCached, putCached, closeCache, listByLanguage } from './cache.js';
import type { Candidate, ValidatedKeyword } from '../lib/types.js';

const KE_ENDPOINT = 'https://api.keywordseverywhere.com/v1/get_keyword_data';
const CHUNK_SIZE = 100;
const DEFAULT_COUNTRY = 'us';
const DEFAULT_DATA_SOURCE = 'gkp';

export function preFilterCandidates(candidates: Candidate[]): Candidate[] {
  // Merge duplicates (union sources), drop sub-3-word fragments.
  const merged = new Map<string, Candidate>();
  for (const c of candidates) {
    if (c.keyword.split(/\s+/).length < 3) continue;
    const key = `${c.keyword}|${c.language}|${c.dimension}`;
    const existing = merged.get(key);
    if (existing) {
      const sources = Array.from(new Set([...existing.sources, ...c.sources])).sort();
      merged.set(key, { ...existing, sources });
    } else {
      merged.set(key, { ...c, sources: [...c.sources] });
    }
  }
  return Array.from(merged.values());
}

export function chunkKeywords<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

interface KeTrendEntry { value: number }
interface KeRow {
  keyword: string;
  vol: number;
  cpc: { value: number } | number;
  competition: number;
  trend: KeTrendEntry[];
}

interface ParsedKeRow {
  keyword: string;
  volume: number;
  cpc: number;
  competition: number;
  trend12mo: number[];
}

export function parseKeResponse(raw: string): ParsedKeRow[] {
  const parsed = JSON.parse(raw);
  const rows: KeRow[] = parsed.data ?? [];
  return rows.map(row => ({
    keyword: row.keyword,
    volume: Number(row.vol ?? 0),
    cpc: typeof row.cpc === 'object' ? Number(row.cpc.value) : Number(row.cpc ?? 0),
    competition: Number(row.competition ?? 0),
    trend12mo: (row.trend ?? []).map(t => Number(t.value)),
  }));
}

async function validateChunk(keywords: string[], country: string, dataSource: string): Promise<ParsedKeRow[]> {
  const body = new URLSearchParams();
  body.append('country', country);
  body.append('currency', 'usd');
  body.append('dataSource', dataSource);
  for (const kw of keywords) body.append('kw[]', kw);

  const { body: respBody, statusCode } = await request(KE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${env.keywordsEverywhereKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const text = await respBody.text();
  if (statusCode !== 200) {
    throw new Error(`KE request failed (${statusCode}): ${text}`);
  }
  return parseKeResponse(text);
}

function readCandidatesCsv(path: string): Candidate[] {
  const content = readFileSync(path, 'utf-8');
  const lines = content.trim().split('\n').slice(1);
  return lines.map(line => {
    const match = line.match(/^"(.*)",([^,]+),(\d+),"(.*)"$/);
    if (!match) throw new Error(`Bad candidate row: ${line}`);
    return {
      keyword: match[1].replace(/""/g, '"'),
      language: match[2],
      dimension: parseInt(match[3], 10),
      sources: match[4].split('|').filter(Boolean),
    };
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      language: { type: 'string', default: 'somali' },
      country: { type: 'string', default: DEFAULT_COUNTRY },
      'data-source': { type: 'string', default: DEFAULT_DATA_SOURCE },
      'dry-run': { type: 'boolean', default: false },
    },
  });

  const languageSlug = values.language!;
  const country = values.country!;
  const dataSource = values['data-source']!;
  const dryRun = values['dry-run']!;

  const candidatesPath = resolve(paths.data, `candidates-${languageSlug}.csv`);
  const raw = readCandidatesCsv(candidatesPath);
  const filtered = preFilterCandidates(raw);
  console.log(`Pre-filter: ${raw.length} → ${filtered.length} candidates`);

  const cache = openCache(paths.database);
  try {
    const needsValidation: Candidate[] = [];
    const cached: ValidatedKeyword[] = [];

    for (const c of filtered) {
      const hit = getCached(cache, c.keyword, country, dataSource);
      if (hit) {
        cached.push(hit);
      } else {
        needsValidation.push(c);
      }
    }
    console.log(`Cache hits: ${cached.length}, cache misses: ${needsValidation.length}`);

    if (dryRun) {
      console.log(`DRY RUN — would spend ${needsValidation.length} credits. Re-run without --dry-run to validate.`);
      return;
    }

    const chunks = chunkKeywords(needsValidation, CHUNK_SIZE);
    let validatedCount = 0;
    let unmatchedCount = 0;
    for (const [i, chunk] of chunks.entries()) {
      console.log(`  Chunk ${i + 1}/${chunks.length} (${chunk.length} keywords)...`);
      const parsed = await validateChunk(chunk.map(c => c.keyword), country, dataSource);
      const byKeyword = new Map(parsed.map(p => [p.keyword, p]));
      const now = new Date().toISOString();
      for (const c of chunk) {
        const data = byKeyword.get(c.keyword);
        if (!data) {
          unmatchedCount++;
          continue;
        }
        const validated: ValidatedKeyword = {
          keyword: c.keyword,
          language: c.language,
          dimension: c.dimension,
          volume: data.volume,
          cpc: data.cpc,
          competition: data.competition,
          trend12mo: data.trend12mo,
          sources: c.sources,
          country,
          dataSource,
          validatedAt: now,
        };
        putCached(cache, validated);
        validatedCount++;
      }
    }
    console.log(`Validated ${validatedCount} keywords (${cached.length} cache hits).`);
    if (unmatchedCount > 0) {
      console.warn(`  ${unmatchedCount} keywords submitted but not returned by KE (likely normalized differently)`);
    }
  } finally {
    closeCache(cache);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

export { listByLanguage };
