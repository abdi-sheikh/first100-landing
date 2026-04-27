import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAutocompleteResponse,
  expandSeedLocally,
  dedupeKeywords,
  reclassifyCandidate,
  buildQualityReport,
} from '../../scripts/seo/expand/autocomplete.js';
import type { Candidate } from '../../scripts/seo/lib/types.js';

test('parseAutocompleteResponse extracts suggestions from Google response shape', () => {
  const raw = JSON.stringify([
    'learn somali',
    ['learn somali for kids', 'learn somali online', 'learn somali free']
  ]);
  const suggestions = parseAutocompleteResponse(raw);
  assert.deepEqual(suggestions, ['learn somali for kids', 'learn somali online', 'learn somali free']);
});

test('parseAutocompleteResponse returns empty array on malformed input', () => {
  assert.deepEqual(parseAutocompleteResponse('not json'), []);
  assert.deepEqual(parseAutocompleteResponse('[]'), []);
});

test('expandSeedLocally generates seed plus productive letter suffixes', () => {
  const variants = expandSeedLocally('learn somali');
  // seed + 20 productive letters (j, q, v, x, y, z dropped as rarely productive)
  assert.equal(variants.length, 21);
  assert.equal(variants[0], 'learn somali');
  assert.equal(variants[1], 'learn somali a');
  assert.ok(variants.includes('learn somali w'));
  assert.ok(!variants.some(v => v.endsWith(' z')));
});

test('dedupeKeywords lowercases, trims, and removes exact dupes', () => {
  const input = [' Learn Somali ', 'learn somali', 'LEARN SOMALI', 'somali'];
  const result = dedupeKeywords(input);
  assert.deepEqual(result, ['learn somali', 'somali']);
});

test('reclassifyCandidate keeps language tag when keyword contains anchor', () => {
  const c: Candidate = { keyword: 'learn swahili for kids', language: 'swahili', dimension: 1, sources: ['autocomplete'] };
  assert.equal(reclassifyCandidate(c).language, 'swahili');
});

test('reclassifyCandidate moves drifted candidate to agnostic', () => {
  const c: Candidate = { keyword: 'how much milk does a 2yr old need', language: 'swahili', dimension: 1, sources: ['autocomplete'] };
  assert.equal(reclassifyCandidate(c).language, 'agnostic');
});

test('reclassifyCandidate is a no-op for already-agnostic candidates', () => {
  const c: Candidate = { keyword: 'when do babies start talking', language: 'agnostic', dimension: 9, sources: ['autocomplete'] };
  assert.equal(reclassifyCandidate(c).language, 'agnostic');
});

test('buildQualityReport counts language-specific and reclassified candidates', () => {
  const candidates: Candidate[] = [
    { keyword: 'learn swahili', language: 'swahili', dimension: 1, sources: ['autocomplete'] },
    { keyword: 'kiswahili songs', language: 'swahili', dimension: 1, sources: ['autocomplete'] },
    { keyword: 'general toddler activities', language: 'agnostic', dimension: 1, sources: ['autocomplete'] },
    { keyword: 'best educational videos', language: 'agnostic', dimension: 1, sources: ['autocomplete'] },
  ];
  const report = buildQualityReport(candidates, 'swahili');
  assert.equal(report.languageSpecific, 2);
  assert.equal(report.reclassifiedToAgnostic, 2);
  assert.equal(report.driftRatio, 0.5);
});
