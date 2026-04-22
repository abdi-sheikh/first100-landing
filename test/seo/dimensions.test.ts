import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIMENSIONS, getDimension, isSharedDimension } from '../../scripts/seo/lib/dimensions.js';

test('DIMENSIONS has exactly 8 entries numbered 1-8', () => {
  assert.equal(DIMENSIONS.length, 8);
  assert.deepEqual(DIMENSIONS.map(d => d.id), [1, 2, 3, 4, 5, 6, 7, 8]);
});

test('isSharedDimension returns true for 3, 4, 6, 8', () => {
  assert.equal(isSharedDimension(3), true);
  assert.equal(isSharedDimension(4), true);
  assert.equal(isSharedDimension(6), true);
  assert.equal(isSharedDimension(8), true);
});

test('isSharedDimension returns false for 1, 2, 5, 7', () => {
  assert.equal(isSharedDimension(1), false);
  assert.equal(isSharedDimension(2), false);
  assert.equal(isSharedDimension(5), false);
  assert.equal(isSharedDimension(7), false);
});

test('getDimension returns the matching dimension', () => {
  const dim = getDimension(4);
  assert.equal(dim.id, 4);
  assert.match(dim.name, /pillar/i);
});
