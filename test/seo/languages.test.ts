import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES, getLanguage } from '../../scripts/seo/lib/languages.js';

test('LANGUAGES has 22 entries', () => {
  assert.equal(LANGUAGES.length, 22);
});

test('Somali is present and marked live', () => {
  const somali = getLanguage('somali');
  assert.equal(somali.name, 'Somali');
  assert.equal(somali.status, 'live');
});

test('All coming-soon languages have null store URLs', () => {
  for (const lang of LANGUAGES) {
    if (lang.status === 'coming-soon') {
      assert.equal(lang.appStore, null);
      assert.equal(lang.playStore, null);
    }
  }
});
