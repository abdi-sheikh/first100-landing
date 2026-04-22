import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeScore } from '../../scripts/seo/score/prioritize.js';
import type { ValidatedKeyword } from '../../scripts/seo/lib/types.js';

function kw(overrides: Partial<ValidatedKeyword> = {}): ValidatedKeyword {
  return {
    keyword: 'learn somali for kids',
    language: 'somali',
    dimension: 1,
    volume: 100,
    cpc: 0.5,
    competition: 0.3,
    trend12mo: [],
    sources: ['autocomplete'],
    country: 'us',
    dataSource: 'gkp',
    validatedAt: new Date().toISOString(),
    ...overrides,
  };
}

test('higher volume produces higher score', () => {
  const low = computeScore(kw({ volume: 10 }));
  const high = computeScore(kw({ volume: 10000 }));
  assert.ok(high > low);
});

test('higher competition produces lower score', () => {
  const easy = computeScore(kw({ competition: 0.1 }));
  const hard = computeScore(kw({ competition: 0.9 }));
  assert.ok(easy > hard);
});

test('multiple sources boost score vs single source', () => {
  const single = computeScore(kw({ sources: ['autocomplete'] }));
  const multi = computeScore(kw({ sources: ['autocomplete', 'paa', 'ke-related'] }));
  assert.ok(multi > single);
});

test('dimension weight affects score', () => {
  // Dimension 4 weight = 1.2, dimension 3 weight = 0.9
  const d3 = computeScore(kw({ dimension: 3 }));
  const d4 = computeScore(kw({ dimension: 4 }));
  assert.ok(d4 > d3);
});

test('score is zero for zero volume', () => {
  assert.equal(computeScore(kw({ volume: 0 })), 0);
});
