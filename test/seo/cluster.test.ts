import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cosineSimilarity, assignClusters } from '../../scripts/seo/score/cluster.js';
import type { ScoredKeyword } from '../../scripts/seo/score/prioritize.js';

test('cosineSimilarity of identical vectors is 1', () => {
  assert.equal(cosineSimilarity([1, 0, 0], [1, 0, 0]), 1);
});

test('cosineSimilarity of orthogonal vectors is 0', () => {
  assert.equal(cosineSimilarity([1, 0, 0], [0, 1, 0]), 0);
});

test('assignClusters groups vectors above similarity threshold', () => {
  const scored: ScoredKeyword[] = [
    { keyword: 'a', language: 'somali', dimension: 1, volume: 100, cpc: 0, competition: 0, trend12mo: [], sources: [], country: 'us', dataSource: 'gkp', validatedAt: '', score: 10 },
    { keyword: 'a-like', language: 'somali', dimension: 1, volume: 50, cpc: 0, competition: 0, trend12mo: [], sources: [], country: 'us', dataSource: 'gkp', validatedAt: '', score: 5 },
    { keyword: 'b', language: 'somali', dimension: 1, volume: 100, cpc: 0, competition: 0, trend12mo: [], sources: [], country: 'us', dataSource: 'gkp', validatedAt: '', score: 10 },
  ];
  const embeddings = new Map<string, number[]>([
    ['a', [1, 0, 0]],
    ['a-like', [0.99, 0.01, 0]],
    ['b', [0, 1, 0]],
  ]);
  const clusters = assignClusters(scored, embeddings, 0.9);
  assert.equal(clusters.length, 2);
  // Highest-score keyword is the primary
  const firstCluster = clusters.find(c => c.primaryKeyword === 'a')!;
  assert.deepEqual(firstCluster.secondaryKeywords, ['a-like']);
});

test('assignClusters never groups across languages', () => {
  const scored: ScoredKeyword[] = [
    { keyword: 'a', language: 'somali',  dimension: 1, volume: 100, cpc: 0, competition: 0, trend12mo: [], sources: [], country: 'us', dataSource: 'gkp', validatedAt: '', score: 10 },
    { keyword: 'b', language: 'spanish', dimension: 1, volume: 100, cpc: 0, competition: 0, trend12mo: [], sources: [], country: 'us', dataSource: 'gkp', validatedAt: '', score: 10 },
  ];
  const embeddings = new Map<string, number[]>([['a', [1, 0]], ['b', [1, 0]]]);
  const clusters = assignClusters(scored, embeddings, 0.5);
  assert.equal(clusters.length, 2);
});
