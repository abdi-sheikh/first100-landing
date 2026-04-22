import OpenAI from 'openai';
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { paths, env, isMainModule } from '../lib/config.js';
import type { Cluster } from '../lib/types.js';
import type { ScoredKeyword } from './prioritize.js';

const SIMILARITY_THRESHOLD = 0.85;
const EMBED_BATCH_SIZE = 100;
const EMBED_MODEL = 'text-embedding-3-small';

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('dim mismatch');
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function embedKeywords(keywords: string[]): Promise<Map<string, number[]>> {
  const openai = new OpenAI({ apiKey: env.openaiKey });
  const map = new Map<string, number[]>();
  for (let i = 0; i < keywords.length; i += EMBED_BATCH_SIZE) {
    const batch = keywords.slice(i, i + EMBED_BATCH_SIZE);
    const resp = await openai.embeddings.create({ model: EMBED_MODEL, input: batch });
    for (let j = 0; j < batch.length; j++) {
      map.set(batch[j], resp.data[j].embedding);
    }
    console.log(`  Embedded ${Math.min(i + EMBED_BATCH_SIZE, keywords.length)} / ${keywords.length}`);
  }
  return map;
}

function suggestContentType(dimension: number): Cluster['suggestedContentType'] {
  if (dimension === 4 || dimension === 6 || dimension === 8) return 'pillar';
  if (dimension === 5) return 'programmatic';
  return 'landing-page';
}

function assignTier(score: number): Cluster['tier'] {
  if (score >= 12) return 1;
  if (score >= 6) return 2;
  if (score >= 2) return 3;
  return 4;
}

export function assignClusters(
  scored: ScoredKeyword[],
  embeddings: Map<string, number[]>,
  threshold: number,
): Cluster[] {
  // Group first by (language, dimension) — we never cluster across these.
  const groups = new Map<string, ScoredKeyword[]>();
  for (const s of scored) {
    const key = `${s.language}|${s.dimension}`;
    const arr = groups.get(key) ?? [];
    arr.push(s);
    groups.set(key, arr);
  }

  const clusters: Cluster[] = [];
  for (const [, members] of groups) {
    // Sort by score desc so higher-score keywords become primaries
    const sorted = [...members].sort((a, b) => b.score - a.score);
    const assigned = new Set<string>();

    for (const primary of sorted) {
      if (assigned.has(primary.keyword)) continue;
      const primaryVec = embeddings.get(primary.keyword);
      if (!primaryVec) continue;

      const cluster: ScoredKeyword[] = [primary];
      assigned.add(primary.keyword);

      for (const candidate of sorted) {
        if (assigned.has(candidate.keyword)) continue;
        const candVec = embeddings.get(candidate.keyword);
        if (!candVec) continue;
        if (cosineSimilarity(primaryVec, candVec) >= threshold) {
          cluster.push(candidate);
          assigned.add(candidate.keyword);
        }
      }

      clusters.push(buildCluster(cluster));
    }
  }

  return clusters.sort((a, b) => b.priorityScore - a.priorityScore);
}

function buildCluster(members: ScoredKeyword[]): Cluster {
  const primary = members[0];
  const secondary = members.slice(1).map(m => m.keyword);
  const volumeSum = members.reduce((s, m) => s + m.volume, 0);
  const maxCpc = Math.max(...members.map(m => m.cpc));
  const avgCompetition = members.reduce((s, m) => s + m.competition, 0) / members.length;
  const priorityScore = primary.score + secondary.reduce((s, _, i) => s + members[i + 1].score * 0.3, 0);

  return {
    clusterId: `${primary.language}-${primary.dimension}-${primary.keyword.replace(/\W+/g, '-').slice(0, 48)}`,
    primaryKeyword: primary.keyword,
    secondaryKeywords: secondary,
    language: primary.language,
    dimension: primary.dimension,
    volumeSum,
    maxCpc,
    avgCompetition,
    priorityScore,
    suggestedContentType: suggestContentType(primary.dimension),
    tier: assignTier(priorityScore),
  };
}

async function main() {
  const { values } = parseArgs({ options: { language: { type: 'string', default: 'somali' } } });
  const languageSlug = values.language!;
  const scoredPath = resolve(paths.data, `scored-${languageSlug}.json`);
  const scored: ScoredKeyword[] = JSON.parse(readFileSync(scoredPath, 'utf-8'));

  console.log(`Embedding ${scored.length} keywords...`);
  const embeddings = await embedKeywords(scored.map(s => s.keyword));

  console.log(`Clustering...`);
  const clusters = assignClusters(scored, embeddings, SIMILARITY_THRESHOLD);
  const outPath = resolve(paths.data, `clusters-${languageSlug}.json`);
  writeFileSync(outPath, JSON.stringify(clusters, null, 2));
  console.log(`Wrote ${clusters.length} clusters to ${outPath}`);
  console.log(`Top clusters:`);
  for (const c of clusters.slice(0, 10)) {
    console.log(`  tier=${c.tier} score=${c.priorityScore.toFixed(2)} vol=${c.volumeSum} "${c.primaryKeyword}" (+${c.secondaryKeywords.length} more)`);
  }
}

if (isMainModule(import.meta.url)) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
