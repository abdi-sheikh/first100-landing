import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAutocompleteResponse, expandSeedLocally, dedupeKeywords } from '../../scripts/seo/expand/autocomplete.js';

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
