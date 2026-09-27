#!/usr/bin/env node
// Copies what the site shows from the apps themselves, so the website never drifts from what
// a child sees and hears:
//   public/app/art/<image>.webp          every word picture in First100 World (512 px)
//   public/app/looks/<member>_<look>.webp the six added families (mother, father, sister, brother, family)
//   public/app/audio/<code>/<image>.mp3  the demo words in every language, silence trimmed
//   public/app/sfx/<image>.mp3           the animal sounds that follow a word
//   src/data/app-words.json              each language's 100 words, and the family its people cards show by default
//
//   node scripts/sync-app-assets.mjs
//
// Expects sibling checkouts: ../first100world, ../abdi-first100somali, and an ffmpeg binary
// (FFMPEG env var, defaults to the one Remotion ships in ../first100-video).

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEV = path.resolve(ROOT, '..');
const WORLD = path.join(DEV, 'first100world');
const SOMALI = path.join(DEV, 'abdi-first100somali');
const COMPOSITOR = path.join(DEV, 'first100-video', 'node_modules', '@remotion', 'compositor-linux-x64-gnu');
const FFMPEG = process.env.FFMPEG || path.join(COMPOSITOR, 'ffmpeg');
const OUT = path.join(ROOT, 'public', 'app');

export const DEMO_WORDS = ['cow', 'dog', 'mother', 'apple', 'sun', 'happy'];
const WORLD_CODES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'ru', 'tr', 'hi', 'th', 'vi', 'id', 'ms', 'ur'];
const FAMILY_FACES = ['mother', 'father', 'sister', 'brother', 'family'];

const mkdir = (p) => fs.mkdirSync(p, { recursive: true });

/** Parse the card lines of a generated categoryData.ts (both apps use the same shape). */
function parseCards(file) {
  const src = fs.readFileSync(file, 'utf8');
  const cards = [];
  for (const line of src.split('\n')) {
    const m = line.match(/english: '((?:[^'\\]|\\.)*)', native: '((?:[^'\\]|\\.)*)', audioFileName: '([^']+)', imageName: (?:'([^']*)'|null)(?:, color: '([^']*)')?, category: '([^']+)'/);
    if (!m) continue;
    const unq = (s) => s.replace(/\\'/g, "'");
    cards.push({ english: unq(m[1]), native: unq(m[2]), audioFileName: m[3], imageName: m[4] || null, color: m[5] || null, category: m[6] });
  }
  return cards;
}

/** Copy an mp3 with its leading silence cut and 0.15 s kept after the voice (stream copy). */
function trimmed(src, dst) {
  mkdir(path.dirname(dst));
  const env = { ...process.env, LD_LIBRARY_PATH: COMPOSITOR };
  let log = '';
  try {
    execFileSync(FFMPEG, ['-hide_banner', '-nostats', '-i', src, '-af', 'silencedetect=n=-45dB:d=0.06', '-f', 'null', '-'], { env, stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) { log = String(e.stderr ?? ''); }
  if (!log) log = execFileSync('sh', ['-c', `"${FFMPEG}" -hide_banner -nostats -i "${src}" -af silencedetect=n=-45dB:d=0.06 -f null - 2>&1`], { env, encoding: 'utf8' });
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  const onset = starts.length && starts[0] < 0.01 ? ends[0] ?? 0 : 0;
  const lastStart = starts.length ? starts[starts.length - 1] : 0;
  const from = Math.max(0, onset - 0.03);
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-ss', from.toFixed(3), '-i', src];
  if (lastStart > onset) args.push('-t', (lastStart + 0.15 - from).toFixed(3));
  execFileSync(FFMPEG, [...args, '-c', 'copy', dst], { env });
}

// 1. Pictures
mkdir(path.join(OUT, 'art'));
for (const f of fs.readdirSync(path.join(WORLD, 'assets', 'images', 'words'))) {
  if (f.endsWith('.webp')) fs.copyFileSync(path.join(WORLD, 'assets', 'images', 'words', f), path.join(OUT, 'art', f));
}
mkdir(path.join(OUT, 'looks'));
for (const look of ['f1', 'f2', 'f3', 'f4', 'f5', 'f6']) {
  for (const m of FAMILY_FACES) {
    fs.copyFileSync(path.join(WORLD, 'assets', 'images', 'words', 'looks', `${m}_${look}.webp`), path.join(OUT, 'looks', `${m}_${look}.webp`));
  }
}

// Each language's default family, read from the app so the site's people match the app's.
const familySrc = fs.readFileSync(path.join(WORLD, 'lib', 'familyLook.ts'), 'utf8');
const familyTable = familySrc.slice(familySrc.indexOf('LANGUAGE_FAMILY'));
const defaultLook = {};
for (const m of familyTable.slice(0, familyTable.indexOf('};')).matchAll(/(\w+): '(daily|f\d)'/g)) defaultLook[m[1]] = m[2] === 'daily' ? 'f0' : m[2];

// Demo words drawn per family (the people ones), so a language's demo shows its own family.
for (const image of DEMO_WORDS) {
  for (const look of ['f1', 'f2', 'f3', 'f4', 'f5', 'f6']) {
    const src = path.join(WORLD, 'assets', 'images', 'words', 'looks', `${image}_${look}.webp`);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(OUT, 'looks', `${image}_${look}.webp`));
  }
}

// 2. Words and demo audio
const words = {};
for (const code of WORLD_CODES) {
  const dir = path.join(WORLD, 'data', 'languages', code);
  const cards = parseCards(path.join(dir, 'categoryData.ts'));
  const audioMap = fs.readFileSync(path.join(dir, 'audioMap.ts'), 'utf8');
  words[code] = cards.map(({ english, native, imageName, color, category }) => ({ english, native, imageName, color, category }));
  for (const image of DEMO_WORDS) {
    const card = cards.find((c) => c.imageName === image);
    const line = card && audioMap.split('\n').find((l) => l.includes(`'${card.audioFileName}':`));
    const rel = line?.match(/native: require\('@\/(assets\/audio\/[^']+)'\)/)?.[1];
    if (!rel) { console.warn(`${code}: no clip for ${image}`); continue; }
    trimmed(path.join(WORLD, rel), path.join(OUT, 'audio', code, `${image}.mp3`));
  }
}

const somaliCards = parseCards(path.join(SOMALI, 'data', 'categoryData.ts'));
words.so = somaliCards.map(({ english, native, imageName, color, category }) => ({ english, native, imageName, color, category }));
for (const image of DEMO_WORDS) {
  const card = somaliCards.find((c) => c.imageName === image);
  if (!card) continue;
  const folder = fs.readdirSync(path.join(SOMALI, 'assets', 'Audio')).find((d) => fs.existsSync(path.join(SOMALI, 'assets', 'Audio', d, `${card.audioFileName}.mp3`)));
  if (folder) trimmed(path.join(SOMALI, 'assets', 'Audio', folder, `${card.audioFileName}.mp3`), path.join(OUT, 'audio', 'so', `${image}.mp3`));
}

// 3. Animal sounds
mkdir(path.join(OUT, 'sfx'));
for (const image of DEMO_WORDS) {
  const src = path.join(WORLD, 'assets', 'audio', 'sfx', `${image}.mp3`);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(OUT, 'sfx', `${image}.mp3`));
}

fs.writeFileSync(path.join(ROOT, 'src', 'data', 'app-words.json'), JSON.stringify({ demoWords: DEMO_WORDS, defaultLook, words }, null, 1));
console.log(`✓ ${Object.keys(words).length} languages; demo clips for ${DEMO_WORDS.join(', ')}`);
