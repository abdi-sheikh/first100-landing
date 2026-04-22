import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { getDimension } from '../lib/dimensions.js';
import { getLanguage } from '../lib/languages.js';
import { openCache, listByLanguage, closeCache } from '../validate/cache.js';
import { paths, isMainModule } from '../lib/config.js';
import type { ValidatedKeyword } from '../lib/types.js';

export function computeScore(kw: ValidatedKeyword): number {
  if (kw.volume <= 0) return 0;

  const volumeTerm = Math.log10(kw.volume + 1);
  const competitionTerm = Math.max(0.01, 1 - kw.competition);
  const dimensionWeight = getDimension(kw.dimension).weight;
  const sourceBoost = 1 + 0.15 * Math.log2(kw.sources.length + 1);

  const languagePriority = kw.language === 'agnostic'
    ? 1.0
    : safeLanguagePriority(kw.language);

  return volumeTerm * competitionTerm * dimensionWeight * sourceBoost * languagePriority;
}

function safeLanguagePriority(slug: string): number {
  try {
    return getLanguage(slug).priority;
  } catch {
    return 0.5;
  }
}

export interface ScoredKeyword extends ValidatedKeyword {
  score: number;
}

export function scoreAll(keywords: ValidatedKeyword[]): ScoredKeyword[] {
  return keywords
    .map(kw => ({ ...kw, score: computeScore(kw) }))
    .sort((a, b) => b.score - a.score);
}

async function main() {
  const { values } = parseArgs({ options: { language: { type: 'string', default: 'somali' } } });
  const languageSlug = values.language!;

  const cache = openCache(paths.database);
  try {
    // Include agnostic + this language
    const perLang = listByLanguage(cache, languageSlug);
    const agnostic = listByLanguage(cache, 'agnostic');

    const scored = scoreAll([...perLang, ...agnostic]);
    const outPath = resolve(paths.data, `scored-${languageSlug}.json`);
    writeFileSync(outPath, JSON.stringify(scored, null, 2));
    console.log(`Scored ${scored.length} keywords. Top 10:`);
    for (const s of scored.slice(0, 10)) {
      console.log(`  ${s.score.toFixed(2)}  vol=${s.volume}  comp=${s.competition.toFixed(2)}  ${s.keyword}`);
    }
  } finally {
    closeCache(cache);
  }
}

if (isMainModule(import.meta.url)) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
