import { test } from 'node:test';
import assert from 'node:assert/strict';
import { preFilterCandidates, chunkKeywords, parseKeResponse } from '../../scripts/seo/validate/ke.js';
import type { Candidate } from '../../scripts/seo/lib/types.js';

test('preFilterCandidates drops sub-3-word seeds', () => {
  const input: Candidate[] = [
    { keyword: 'somali', language: 'somali', dimension: 1, sources: ['autocomplete'] },
    { keyword: 'somali app', language: 'somali', dimension: 1, sources: ['autocomplete'] },
    { keyword: 'somali app toddler', language: 'somali', dimension: 1, sources: ['autocomplete'] },
  ];
  const out = preFilterCandidates(input);
  assert.equal(out.length, 1);
  assert.equal(out[0].keyword, 'somali app toddler');
});

test('preFilterCandidates deduplicates on keyword+language+dimension', () => {
  const input: Candidate[] = [
    { keyword: 'learn somali for kids', language: 'somali', dimension: 1, sources: ['autocomplete'] },
    { keyword: 'learn somali for kids', language: 'somali', dimension: 1, sources: ['paa'] },
  ];
  const out = preFilterCandidates(input);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].sources.sort(), ['autocomplete', 'paa']);
});

test('chunkKeywords splits into groups of 100', () => {
  const input = Array.from({ length: 250 }, (_, i) => `kw${i}`);
  const chunks = chunkKeywords(input, 100);
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].length, 100);
  assert.equal(chunks[2].length, 50);
});

test('parseKeResponse extracts vol, cpc, competition, trend', () => {
  const raw = JSON.stringify({
    data: [{
      keyword: 'learn somali for kids',
      vol: 880,
      cpc: { value: 0.45 },
      competition: 0.12,
      trend: [
        { month: 'January', year: 2025, value: 100 },
        { month: 'February', year: 2025, value: 110 },
      ],
    }],
  });
  const parsed = parseKeResponse(raw);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].keyword, 'learn somali for kids');
  assert.equal(parsed[0].volume, 880);
  assert.equal(parsed[0].cpc, 0.45);
  assert.equal(parsed[0].competition, 0.12);
  assert.deepEqual(parsed[0].trend12mo, [100, 110]);
});
