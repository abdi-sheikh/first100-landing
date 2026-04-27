import { request } from 'undici';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { paths, isMainModule } from '../lib/config.js';
import { hasLanguageAnchor, LANGUAGE_ANCHORS } from '../lib/language-anchors.js';
import type { Seed, Candidate } from '../lib/types.js';

// Drop j, q, v, x, y, z — rarely productive as query-start letters in English parent queries.
const LETTERS = 'abcdefghiklmnoprstuw'.split('');
const RATE_LIMIT_MS = 150; // ~6.5 req/sec; fail-loud backoff handles rate limits.
const BATCH_SIZE = 20;
const BACKOFF_MS = 30_000; // 30 seconds after a rate limit hit
const MAX_CONSECUTIVE_FAILURES = 3; // abort if Google keeps refusing

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

class RateLimitedError extends Error {
  constructor(query: string) {
    super(`Google returned rate-limit page for "${query}"`);
  }
}

async function fetchSuggestions(query: string): Promise<string[]> {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;
  const { body, statusCode } = await request(url);
  const raw = await body.text();
  if (statusCode === 429 || raw.startsWith('<html')) {
    throw new RateLimitedError(query);
  }
  if (statusCode !== 200) {
    throw new Error(`Autocomplete HTTP ${statusCode} for "${query}": ${raw.slice(0, 120)}`);
  }
  return parseAutocompleteResponse(raw);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function expandSeed(seed: Seed): Promise<Candidate[]> {
  const variants = expandSeedLocally(seed.seed);
  const allSuggestions: string[] = [];
  let consecutiveFailures = 0;

  for (const variant of variants) {
    try {
      const suggestions = await fetchSuggestions(variant);
      allSuggestions.push(...suggestions);
      consecutiveFailures = 0;
      await sleep(RATE_LIMIT_MS);
    } catch (err) {
      consecutiveFailures++;
      if (err instanceof RateLimitedError) {
        console.warn(`  rate-limited on "${variant}" (consecutive=${consecutiveFailures}); backing off ${BACKOFF_MS}ms`);
        await sleep(BACKOFF_MS);
      } else {
        console.warn(`  fetch error on "${variant}": ${(err as Error).message}`);
        await sleep(RATE_LIMIT_MS);
      }
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        throw new Error(`Aborting: ${MAX_CONSECUTIVE_FAILURES} consecutive failures — IP likely blocked. Last: ${(err as Error).message}`);
      }
    }
  }

  const deduped = dedupeKeywords(allSuggestions);
  return deduped.map(keyword => reclassifyCandidate({
    keyword,
    language: seed.language,
    dimension: seed.dimension,
    sources: ['autocomplete'],
  }));
}

// If a per-language candidate doesn't actually contain a language-anchor token,
// reclassify it to 'agnostic'. Drifted candidates are real keywords — they just
// weren't actually about the language they were collected under. Reclassifying
// (vs. dropping) lets them count once in the agnostic pool instead of being
// mis-tagged 22 times across per-language runs.
export function reclassifyCandidate(candidate: Candidate): Candidate {
  if (candidate.language === 'agnostic') return candidate;
  if (!LANGUAGE_ANCHORS[candidate.language]) return candidate;
  if (hasLanguageAnchor(candidate.keyword, candidate.language)) return candidate;
  return { ...candidate, language: 'agnostic' };
}

export interface ExpansionQualityReport {
  language: string;
  totalCandidates: number;
  languageSpecific: number;
  reclassifiedToAgnostic: number;
  driftRatio: number;
}

export function buildQualityReport(
  candidates: Candidate[],
  languageSlug: string,
): ExpansionQualityReport {
  let languageSpecific = 0;
  let reclassifiedToAgnostic = 0;
  for (const c of candidates) {
    if (c.language === languageSlug) languageSpecific++;
    else if (c.language === 'agnostic') reclassifiedToAgnostic++;
  }
  const total = languageSpecific + reclassifiedToAgnostic;
  const driftRatio = total === 0 ? 0 : reclassifiedToAgnostic / total;
  return {
    language: languageSlug,
    totalCandidates: candidates.length,
    languageSpecific,
    reclassifiedToAgnostic,
    driftRatio,
  };
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

function readExistingCandidates(path: string): Candidate[] {
  try {
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
  } catch {
    return [];
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      language: { type: 'string', default: 'somali' },
      dimensions: { type: 'string', default: '' },
      append: { type: 'boolean', default: false },
    },
  });
  const languageSlug = values.language!;
  const dimFilter = (values.dimensions ?? '')
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !Number.isNaN(n));
  const append = Boolean(values.append);

  const seedsPath = resolve(paths.data, `seeds-${languageSlug}.csv`);
  let seeds = readSeedsCsv(seedsPath);
  if (dimFilter.length > 0) {
    seeds = seeds.filter(s => dimFilter.includes(s.dimension));
    console.log(`Filtered to dimensions [${dimFilter.join(', ')}]: ${seeds.length} seeds`);
  }
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

  mkdirSync(paths.data, { recursive: true });
  const outPath = resolve(paths.data, `candidates-${languageSlug}.csv`);

  const existing = append ? readExistingCandidates(outPath) : [];
  const merged = [...existing, ...allCandidates];

  // Dedup on (keyword, language, dimension), union sources
  const seen = new Map<string, Candidate>();
  for (const c of merged) {
    const key = `${c.keyword}|${c.language}|${c.dimension}`;
    const prev = seen.get(key);
    if (prev) {
      const sources = Array.from(new Set([...prev.sources, ...c.sources])).sort();
      seen.set(key, { ...prev, sources });
    } else {
      seen.set(key, { ...c, sources: [...c.sources] });
    }
  }
  const final = Array.from(seen.values());

  writeFileSync(outPath, toCandidatesCsv(final));
  console.log(`Wrote ${final.length} candidates to ${outPath} (${existing.length} pre-existing, ${allCandidates.length} new before dedup)`);

  if (LANGUAGE_ANCHORS[languageSlug]) {
    const report = buildQualityReport(final, languageSlug);
    console.log(`\nQuality report for ${languageSlug}:`);
    console.log(`  total candidates: ${report.totalCandidates}`);
    console.log(`  language-specific: ${report.languageSpecific}`);
    console.log(`  reclassified to agnostic (drift): ${report.reclassifiedToAgnostic}`);
    console.log(`  drift ratio: ${(report.driftRatio * 100).toFixed(1)}%`);
  }
}

if (isMainModule(import.meta.url)) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
