import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { openCache, closeCache, getCached, putCached, listByLanguage, type Cache } from '../../scripts/seo/validate/cache.js';
import type { ValidatedKeyword } from '../../scripts/seo/lib/types.js';

let tmp: string;
let cache: Cache;

beforeEach(() => {
  tmp = mkdtempSync(resolve(tmpdir(), 'seo-cache-'));
  cache = openCache(resolve(tmp, 'test.db'));
});

afterEach(() => {
  closeCache(cache);
  rmSync(tmp, { recursive: true, force: true });
});

const sample: ValidatedKeyword = {
  keyword: 'learn somali for kids',
  language: 'somali',
  dimension: 1,
  volume: 880,
  cpc: 0.45,
  competition: 0.12,
  trend12mo: [100, 110, 120, 105, 90, 95, 110, 115, 120, 125, 130, 135],
  sources: ['autocomplete'],
  country: 'us',
  dataSource: 'gkp',
  validatedAt: '2026-04-22T00:00:00Z',
};

test('getCached returns null for missing keyword', () => {
  const hit = getCached(cache, 'nonexistent', 'us', 'gkp');
  assert.equal(hit, null);
});

test('putCached and getCached round-trip a keyword', () => {
  putCached(cache, sample);
  const hit = getCached(cache, sample.keyword, 'us', 'gkp');
  assert.ok(hit);
  assert.equal(hit.volume, 880);
  assert.deepEqual(hit.trend12mo, sample.trend12mo);
  assert.deepEqual(hit.sources, ['autocomplete']);
});

test('getCached respects TTL (90 days)', () => {
  const stale = { ...sample, validatedAt: '2020-01-01T00:00:00Z' };
  putCached(cache, stale);
  const hit = getCached(cache, sample.keyword, 'us', 'gkp');
  assert.equal(hit, null, 'stale entries should be treated as missing');
});

test('getCached distinguishes by country and dataSource', () => {
  putCached(cache, sample);
  assert.equal(getCached(cache, sample.keyword, 'gb', 'gkp'), null);
  assert.equal(getCached(cache, sample.keyword, 'us', 'cli'), null);
  assert.ok(getCached(cache, sample.keyword, 'us', 'gkp'));
});

test('listByLanguage excludes stale entries (TTL)', () => {
  const stale = { ...sample, keyword: 'stale entry', validatedAt: '2020-01-01T00:00:00Z' };
  const fresh = { ...sample, keyword: 'fresh entry' };
  putCached(cache, stale);
  putCached(cache, fresh);
  const results = listByLanguage(cache, 'somali');
  assert.equal(results.length, 1);
  assert.equal(results[0].keyword, 'fresh entry');
});
