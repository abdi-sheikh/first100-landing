import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasLanguageAnchor,
  getAnchorTokens,
  LANGUAGE_ANCHORS,
} from '../../scripts/seo/lib/language-anchors.js';
import { LANGUAGES } from '../../scripts/seo/lib/languages.js';

test('every language in LANGUAGES has an entry in LANGUAGE_ANCHORS', () => {
  for (const lang of LANGUAGES) {
    assert.ok(
      LANGUAGE_ANCHORS[lang.slug],
      `Missing anchor list for ${lang.slug}`
    );
    const tokens = getAnchorTokens(lang.slug);
    assert.ok(tokens.length > 0, `Empty anchor list for ${lang.slug}`);
  }
});

test('hasLanguageAnchor returns true for keywords containing the language name', () => {
  assert.equal(hasLanguageAnchor('learn swahili for kids', 'swahili'), true);
  assert.equal(hasLanguageAnchor('best zulu books for children', 'zulu'), true);
  assert.equal(hasLanguageAnchor('amharic alphabet poster', 'amharic'), true);
});

test('hasLanguageAnchor returns false for drifted candidates', () => {
  assert.equal(hasLanguageAnchor('sand play for toddlers benefits', 'swahili'), false);
  assert.equal(hasLanguageAnchor('how much milk does a 2yr old need', 'swahili'), false);
  assert.equal(hasLanguageAnchor('best educational videos for toddlers', 'zulu'), false);
});

test('hasLanguageAnchor matches case-insensitively', () => {
  assert.equal(hasLanguageAnchor('Learn SWAHILI With Songs', 'swahili'), true);
  assert.equal(hasLanguageAnchor('SPANISH for KIDS', 'spanish'), true);
});

test('hasLanguageAnchor uses word boundaries — does not match substrings', () => {
  assert.equal(hasLanguageAnchor('mandible reconstruction', 'mandarin'), false);
  assert.equal(hasLanguageAnchor('frenchman bay vacation', 'french'), false); // "frenchman" is one word
  assert.equal(hasLanguageAnchor('the french riviera', 'french'), true); // "french" stands alone
});

test('hasLanguageAnchor matches alternate names and endonyms', () => {
  assert.equal(hasLanguageAnchor('kiswahili lessons', 'swahili'), true);
  assert.equal(hasLanguageAnchor('soomaali words', 'somali'), true);
  assert.equal(hasLanguageAnchor('bahasa indonesia for kids', 'indonesian'), true);
  assert.equal(hasLanguageAnchor('learn nihongo', 'japanese'), true);
});

test('hasLanguageAnchor matches native-script tokens', () => {
  assert.equal(hasLanguageAnchor('中文 for kids', 'mandarin'), true);
  assert.equal(hasLanguageAnchor('learn 한국어', 'korean'), true);
  assert.equal(hasLanguageAnchor('books in अमहर', 'amharic'), false); // wrong script
  assert.equal(hasLanguageAnchor('አማርኛ flashcards', 'amharic'), true);
});

test('hasLanguageAnchor accepts compound/alternate forms (mandarin → chinese)', () => {
  assert.equal(hasLanguageAnchor('learn chinese for kids', 'mandarin'), true);
  assert.equal(hasLanguageAnchor('chinese new year crafts', 'mandarin'), true);
});

test('hasLanguageAnchor throws for unknown language slug', () => {
  assert.throws(() => hasLanguageAnchor('test', 'klingon'));
});
