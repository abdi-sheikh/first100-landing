import { stringify } from 'csv-stringify/sync';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { paths } from '../lib/config.js';
import { getDimension } from '../lib/dimensions.js';
import type { Cluster } from '../lib/types.js';

export function clustersToCsv(clusters: Cluster[]): string {
  const rows = clusters.map(c => ({
    cluster_id: c.clusterId,
    primary_keyword: c.primaryKeyword,
    secondary_keywords: c.secondaryKeywords.join('|'),
    language: c.language,
    dimension: c.dimension,
    dimension_name: getDimension(c.dimension).name,
    volume_sum: c.volumeSum,
    max_cpc: c.maxCpc.toFixed(2),
    avg_competition: c.avgCompetition.toFixed(3),
    priority_score: c.priorityScore.toFixed(2),
    suggested_content_type: c.suggestedContentType,
    tier: c.tier,
  }));
  return stringify(rows, { header: true });
}

export function clustersToMarkdown(clusters: Cluster[]): string {
  const byTier = new Map<number, Cluster[]>();
  for (const c of clusters) {
    const arr = byTier.get(c.tier) ?? [];
    arr.push(c);
    byTier.set(c.tier, arr);
  }

  const out: string[] = ['# First100 Content Matrix', ''];
  for (const tier of [1, 2, 3, 4]) {
    const rows = byTier.get(tier) ?? [];
    if (rows.length === 0) continue;
    out.push(`## Tier ${tier} (${rows.length} clusters)`, '');
    out.push('| Primary | Lang | Dim | Volume | Comp | Score | Type |');
    out.push('|---|---|---|---|---|---|---|');
    for (const c of rows) {
      out.push(`| ${c.primaryKeyword} | ${c.language} | ${c.dimension} | ${c.volumeSum} | ${c.avgCompetition.toFixed(2)} | ${c.priorityScore.toFixed(1)} | ${c.suggestedContentType} |`);
    }
    out.push('');
  }

  return out.join('\n');
}

async function main() {
  const { values } = parseArgs({ options: { language: { type: 'string', default: 'somali' } } });
  const languageSlug = values.language!;
  const clustersPath = `${paths.data}/clusters-${languageSlug}.json`;
  const clusters: Cluster[] = JSON.parse(readFileSync(clustersPath, 'utf-8'));

  mkdirSync(paths.output, { recursive: true });
  const csvPath = `${paths.output}/content-matrix-${languageSlug}.csv`;
  const mdPath = `${paths.output}/content-matrix-${languageSlug}.md`;
  writeFileSync(csvPath, clustersToCsv(clusters));
  writeFileSync(mdPath, clustersToMarkdown(clusters));
  console.log(`Wrote matrix to:`);
  console.log(`  ${csvPath}`);
  console.log(`  ${mdPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
