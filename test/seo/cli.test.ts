import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCliArgs } from '../../scripts/seo/cli.js';

test('parseCliArgs requires --language', () => {
  assert.throws(() => parseCliArgs([]));
});

test('parseCliArgs parses --language and --skip flags', () => {
  const args = parseCliArgs(['--language=somali', '--skip=seeds,expand']);
  assert.equal(args.language, 'somali');
  assert.deepEqual(args.skip, ['seeds', 'expand']);
});

test('parseCliArgs supports --dry-run', () => {
  const args = parseCliArgs(['--language=somali', '--dry-run']);
  assert.equal(args.dryRun, true);
});
