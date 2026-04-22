import { request } from 'undici';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { paths } from '../lib/config.js';
import type { Seed, Candidate } from '../lib/types.js';

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const RATE_LIMIT_MS = 120; // ~8 req/sec, polite
const BATCH_SIZE = 20;

export function expandSeedLocally(seed: string): string[] {
  const variants = [seed];
  for (const letter of LETTERS) {
    variants.push(`${seed} ${letter}`);
  }
  return variants;
}

export function parseAutocompleteResponse(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length < 2) return [];
    const suggestions = parsed[1];
    if (!Array.isArray(suggestions)) return [];
    return suggestions.filter((s): s is string => typeof s === 'string');
  } catch {
    return [];
  }
}

export function dedupeKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keywords) {
    const norm = k.trim().toLowerCase();
    if (norm.length === 0) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }
  return out;
}

async function fetchSuggestions(query: string): Promise<string[]> {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;
  try {
    const { body, statusCode } = await request(url);
    if (statusCode !== 200) return [];
    const raw = await body.text();
    return parseAutocompleteResponse(raw);
  } catch (err) {
    console.error(`Autocomplete fetch failed for "${query}":`, err);
    return [];
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function expandSeed(seed: Seed): Promise<Candidate[]> {
  const variants = expandSeedLocally(seed.seed);
  const allSuggestions: string[] = [];

  for (const variant of variants) {
    const suggestions = await fetchSuggestions(variant);
    allSuggestions.push(...suggestions);
    await sleep(RATE_LIMIT_MS);
  }

  const deduped = dedupeKeywords(allSuggestions);
  return deduped.map(keyword => ({
    keyword,
    language: seed.language,
    dimension: seed.dimension,
    sources: ['autocomplete'],
  }));
}

function readSeedsCsv(path: string): Seed[] {
  const content = readFileSync(path, 'utf-8');
  const lines = content.trim().split('\n').slice(1); // skip header
  return lines.map(line => {
    const match = line.match(/^([^,]+),(\d+),"(.*)"$/);
    if (!match) throw new Error(`Bad seed row: ${line}`);
    return { language: match[1], dimension: parseInt(match[2], 10), seed: match[3].replace(/""/g, '"') };
  });
}

function toCandidatesCsv(candidates: Candidate[]): string {
  const header = 'keyword,language,dimension,sources\n';
  const rows = candidates
    .map(c => `"${c.keyword.replace(/"/g, '""')}",${c.language},${c.dimension},"${c.sources.join('|')}"`)
    .join('\n');
  return header + rows + '\n';
}

async function main() {
  const { values } = parseArgs({ options: { language: { type: 'string', default: 'somali' } } });
  const languageSlug = values.language!;
  const seedsPath = resolve(paths.data, `seeds-${languageSlug}.csv`);
  const seeds = readSeedsCsv(seedsPath);
  console.log(`Expanding ${seeds.length} seeds via Google autocomplete...`);

  const allCandidates: Candidate[] = [];
  for (let i = 0; i < seeds.length; i += BATCH_SIZE) {
    const batch = seeds.slice(i, i + BATCH_SIZE);
    for (const seed of batch) {
      const cands = await expandSeed(seed);
      allCandidates.push(...cands);
    }
    console.log(`  ${Math.min(i + BATCH_SIZE, seeds.length)} / ${seeds.length} seeds processed`);
  }

  // Dedup across all candidates, keeping first (language, dimension)
  const seen = new Map<string, Candidate>();
  for (const c of allCandidates) {
    const key = `${c.keyword}|${c.language}|${c.dimension}`;
    if (!seen.has(key)) seen.set(key, c);
  }
  const final = Array.from(seen.values());

  mkdirSync(paths.data, { recursive: true });
  const outPath = resolve(paths.data, `candidates-${languageSlug}.csv`);
  writeFileSync(outPath, toCandidatesCsv(final));
  console.log(`Wrote ${final.length} candidates to ${outPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
