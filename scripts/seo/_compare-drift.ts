// One-off: compare per-language drift before vs after Ticket 6 fix.
// Reads pre-fix snapshots from data/_pre-drift-fix/ and current data/.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LANGS = ['bengali','indonesian','malay','thai','vietnamese','amharic','swahili','zulu','afrikaans'];
const DATA = resolve('scripts/seo/data');
const PRE = resolve(DATA, '_pre-drift-fix');

interface Row { lang: string; total: number; specific: number; agnostic: number; drift: number; }

function summarize(path: string, langSlug: string): { total: number; specific: number; agnostic: number } {
  let total = 0, specific = 0, agnostic = 0;
  try {
    const lines = readFileSync(path, 'utf-8').trim().split('\n').slice(1);
    for (const line of lines) {
      const m = line.match(/^"(.*)",([^,]+),(\d+),"(.*)"$/);
      if (!m) continue;
      total++;
      if (m[2] === langSlug) specific++;
      else if (m[2] === 'agnostic') agnostic++;
    }
  } catch {}
  return { total, specific, agnostic };
}

console.log('lang        | pre.specific | post.specific | pre.agnostic | post.agnostic | pre.drift | post.drift');
console.log('------------|--------------|---------------|--------------|---------------|-----------|-----------');
for (const lang of LANGS) {
  const pre = summarize(resolve(PRE, `candidates-${lang}.csv`), lang);
  const post = summarize(resolve(DATA, `candidates-${lang}.csv`), lang);
  const preDrift = (pre.specific + pre.agnostic) === 0 ? 0 : pre.agnostic / (pre.specific + pre.agnostic);
  const postDrift = (post.specific + post.agnostic) === 0 ? 0 : post.agnostic / (post.specific + post.agnostic);
  console.log(
    `${lang.padEnd(11)} | ${String(pre.specific).padStart(12)} | ${String(post.specific).padStart(13)} | ${String(pre.agnostic).padStart(12)} | ${String(post.agnostic).padStart(13)} | ${(preDrift*100).toFixed(1).padStart(8)}% | ${(postDrift*100).toFixed(1).padStart(8)}%`
  );
}
