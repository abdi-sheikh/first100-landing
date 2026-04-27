// One-off Ticket 6 backfill: read existing candidates-{lang}.csv and existing
// cached validations, apply the new reclassifyCandidate() filter to both, then
// re-emit candidates and re-run score → cluster → matrix for each language.
//
// This avoids ~3-4 hours of autocomplete re-expansion + redundant KE calls.
// Cache (keyword, country, dataSource) PRIMARY KEY guarantees no double-counting
// when the same drifted keyword appears under multiple languages.
//
// Run: npx tsx scripts/seo/_reclassify-existing.ts --language=bengali
//   or: npx tsx scripts/seo/_reclassify-existing.ts --language=all

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { paths } from './lib/config.js';
import { hasLanguageAnchor, LANGUAGE_ANCHORS } from './lib/language-anchors.js';
import { reclassifyCandidate } from './expand/autocomplete.js';
import { openCache, closeCache } from './validate/cache.js';
import type { Candidate } from './lib/types.js';

const TIER_CD = ['bengali','indonesian','malay','thai','vietnamese','amharic','swahili','zulu','afrikaans'];

function readCandidates(path: string): Candidate[] {
  const content = readFileSync(path, 'utf-8');
  const lines = content.trim().split('\n').slice(1);
  return lines.map(line => {
    const m = line.match(/^"(.*)",([^,]+),(\d+),"(.*)"$/);
    if (!m) throw new Error(`Bad row: ${line}`);
    return {
      keyword: m[1].replace(/""/g, '"'),
      language: m[2],
      dimension: parseInt(m[3], 10),
      sources: m[4].split('|').filter(Boolean),
    };
  });
}

function writeCandidates(path: string, candidates: Candidate[]): void {
  const header = 'keyword,language,dimension,sources\n';
  const rows = candidates
    .map(c => `"${c.keyword.replace(/"/g, '""')}",${c.language},${c.dimension},"${c.sources.join('|')}"`)
    .join('\n');
  writeFileSync(path, header + rows + '\n');
}

function reclassifyCacheRows(language: string): { updated: number; total: number } {
  const cache = openCache(paths.database);
  try {
    const rows = cache
      .prepare(`SELECT keyword, country, data_source, language FROM keywords WHERE language = ?`)
      .all(language) as Array<{ keyword: string; country: string; data_source: string; language: string }>;
    let updated = 0;
    for (const row of rows) {
      if (!hasLanguageAnchor(row.keyword, language)) {
        cache
          .prepare(`UPDATE keywords SET language = 'agnostic' WHERE keyword = ? AND country = ? AND data_source = ?`)
          .run(row.keyword, row.country, row.data_source);
        updated++;
      }
    }
    return { updated, total: rows.length };
  } finally {
    closeCache(cache);
  }
}

function reclassifyCandidatesFile(language: string): { reclassified: number; specific: number; total: number } {
  const path = resolve(paths.data, `candidates-${language}.csv`);
  const candidates = readCandidates(path);
  let reclassified = 0;
  let specific = 0;
  const out = candidates.map(c => {
    const updated = reclassifyCandidate(c);
    if (updated.language === 'agnostic' && c.language === language) reclassified++;
    if (updated.language === language) specific++;
    return updated;
  });
  // Dedup on (keyword, language, dimension)
  const seen = new Map<string, Candidate>();
  for (const c of out) {
    const key = `${c.keyword}|${c.language}|${c.dimension}`;
    const prev = seen.get(key);
    if (prev) {
      seen.set(key, { ...prev, sources: Array.from(new Set([...prev.sources, ...c.sources])).sort() });
    } else {
      seen.set(key, c);
    }
  }
  const final = Array.from(seen.values());
  writeCandidates(path, final);
  return { reclassified, specific, total: final.length };
}

function runStage(script: string, language: string): void {
  const result = spawnSync('npx', ['tsx', script, `--language=${language}`], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Stage ${script} failed: ${result.status}`);
}

async function processLanguage(language: string): Promise<void> {
  if (!LANGUAGE_ANCHORS[language]) {
    console.log(`Skipping ${language}: no anchor list`);
    return;
  }
  console.log(`\n=== ${language} ===`);

  const cacheStats = reclassifyCacheRows(language);
  console.log(`  cache: ${cacheStats.updated}/${cacheStats.total} rows reclassified to agnostic`);

  const fileStats = reclassifyCandidatesFile(language);
  console.log(`  candidates.csv: ${fileStats.reclassified} reclassified, ${fileStats.specific} specific, ${fileStats.total} total`);

  runStage('scripts/seo/score/prioritize.ts', language);
  runStage('scripts/seo/score/cluster.ts', language);
  runStage('scripts/seo/export/matrix.ts', language);
}

async function main() {
  const { values } = parseArgs({
    options: { language: { type: 'string', default: 'all' } },
  });
  const target = values.language!;
  const langs = target === 'all' ? TIER_CD : [target];

  for (const lang of langs) {
    await processLanguage(lang);
  }
  console.log('\nReclassification + rescoring complete.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
