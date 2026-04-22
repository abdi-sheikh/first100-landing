import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clustersToCsv, clustersToMarkdown } from '../../scripts/seo/export/matrix.js';
import type { Cluster } from '../../scripts/seo/lib/types.js';

const sample: Cluster[] = [
  {
    clusterId: 'somali-1-learn-somali-for-kids',
    primaryKeyword: 'learn somali for kids',
    secondaryKeywords: ['somali app for toddlers', 'first somali words'],
    language: 'somali',
    dimension: 1,
    volumeSum: 1200,
    maxCpc: 0.55,
    avgCompetition: 0.18,
    priorityScore: 14.2,
    suggestedContentType: 'landing-page',
    tier: 1,
  },
];

test('clustersToCsv produces header and one row per cluster', () => {
  const csv = clustersToCsv(sample);
  const lines = csv.trim().split('\n');
  assert.equal(lines.length, 2);
  assert.match(lines[0], /primary_keyword/);
  assert.match(lines[1], /learn somali for kids/);
});

test('clustersToCsv joins secondary keywords with pipe', () => {
  const csv = clustersToCsv(sample);
  assert.match(csv, /somali app for toddlers\|first somali words/);
});

test('clustersToMarkdown groups by tier', () => {
  const md = clustersToMarkdown(sample);
  assert.match(md, /## Tier 1/);
  assert.match(md, /learn somali for kids/);
});
