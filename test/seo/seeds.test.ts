import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSeedPrompt, parseSeedResponse } from '../../scripts/seo/seeds/generate.js';
import { getDimension } from '../../scripts/seo/lib/dimensions.js';
import { getLanguage } from '../../scripts/seo/lib/languages.js';

test('buildSeedPrompt includes dimension name and example', () => {
  const prompt = buildSeedPrompt(getDimension(1), getLanguage('somali'));
  assert.match(prompt, /Per-language intent/);
  assert.match(prompt, /Somali/);
  assert.match(prompt, /learn somali for kids/);
});

test('buildSeedPrompt for shared dimension does not reference a language', () => {
  const prompt = buildSeedPrompt(getDimension(4), null);
  assert.match(prompt, /Horizontal pillar/);
  assert.doesNotMatch(prompt, /somali/i);
});

test('parseSeedResponse extracts seeds from JSON array response', () => {
  const raw = '["learn somali for kids", "somali app for toddlers", "first somali words baby"]';
  const seeds = parseSeedResponse(raw);
  assert.equal(seeds.length, 3);
  assert.equal(seeds[0], 'learn somali for kids');
});

test('parseSeedResponse deduplicates and lowercases', () => {
  const raw = '["Learn Somali", "learn somali", "LEARN SOMALI"]';
  const seeds = parseSeedResponse(raw);
  assert.equal(seeds.length, 1);
  assert.equal(seeds[0], 'learn somali');
});

test('parseSeedResponse throws on malformed input', () => {
  assert.throws(() => parseSeedResponse('not json'));
});
