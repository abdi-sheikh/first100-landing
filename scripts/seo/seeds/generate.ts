import OpenAI from 'openai';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { parseArgs } from 'node:util';
import { DIMENSIONS, getDimension, type Dimension } from '../lib/dimensions.js';
import { LANGUAGES, getLanguage, type Language } from '../lib/languages.js';
import { paths, env, isMainModule } from '../lib/config.js';
import type { Seed } from '../lib/types.js';

const SEEDS_PER_DIMENSION = 40;

export function buildSeedPrompt(dimension: Dimension, language: Language | null): string {
  const languageBlock = language
    ? `Target language: ${language.name} (${language.nativeName}).
IMPORTANT: The seeds themselves MUST be written in English. They are queries English-speaking parents in the US/UK/Canada/Australia would type when searching about the ${language.name} language for their toddlers. Do NOT write seeds in ${language.name} itself.`
    : 'Target: language-agnostic (applies to all toddler language apps equally). Seeds must be in English.';

  return `Generate ${SEEDS_PER_DIMENSION} search-query seeds for SEO research.

Dimension: ${dimension.name}
Example of a seed in this dimension: "${dimension.example}"

${languageBlock}

Rules:
- Each seed is a realistic Google search query a parent would type.
- All seeds must be in English.
- Lowercase, 3-8 words each.
- No duplicates.
- Return ONLY a JSON array of strings. No prose.

Example output:
["first seed here", "second seed here", "..."]`;
}

export function parseSeedResponse(raw: string): string[] {
  return extractSeeds(JSON.parse(raw));
}

export function seedsToCsv(seeds: Seed[]): string {
  const header = 'language,dimension,seed\n';
  const rows = seeds
    .map(s => `${s.language},${s.dimension},"${s.seed.replace(/"/g, '""')}"`)
    .join('\n');
  return header + rows + '\n';
}

async function generateSeedsForDimension(
  openai: OpenAI,
  dimension: Dimension,
  language: Language | null
): Promise<string[]> {
  const prompt = buildSeedPrompt(dimension, language);
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });
  const raw = response.choices[0].message.content;
  if (!raw) {
    throw new Error(`Empty LLM response for dimension ${dimension.id} (${dimension.name})`);
  }
  try {
    const parsed = JSON.parse(raw);
    const arr = findStringArray(parsed);
    if (arr.length === 0) {
      console.warn(`No seed array found in response for dim ${dimension.id}: ${raw.slice(0, 200)}`);
    }
    return extractSeeds(arr);
  } catch (err) {
    console.error(`Failed to parse seeds for dimension ${dimension.id}: ${raw}`);
    throw err;
  }
}

// Walk a parsed JSON value and return the first string[] we find.
// Handles direct arrays, {seeds: [...]}, {queries: [...]}, or any key wrapping an array of strings.
function findStringArray(value: unknown): string[] {
  if (Array.isArray(value) && value.every(v => typeof v === 'string')) return value as string[];
  if (value && typeof value === 'object') {
    for (const v of Object.values(value)) {
      const found = findStringArray(v);
      if (found.length > 0) return found;
    }
  }
  return [];
}

function extractSeeds(value: unknown): string[] {
  const arr = z.array(z.string()).parse(value);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of arr) {
    const lower = s.trim().toLowerCase();
    if (lower.length === 0) continue;
    if (seen.has(lower)) continue;
    seen.add(lower);
    out.push(lower);
  }
  return out;
}

export async function generateAllSeeds(
  languageSlug: string,
  dimensionFilter: number[] = [],
): Promise<Seed[]> {
  const openai = new OpenAI({ apiKey: env.openaiKey });
  const language = getLanguage(languageSlug);
  const seeds: Seed[] = [];

  for (const dimension of DIMENSIONS) {
    // Skip dimension 5 — no validation for long-tail programmatic
    if (dimension.sharing === 'skip-validation') continue;
    if (dimensionFilter.length > 0 && !dimensionFilter.includes(dimension.id)) continue;

    const useLanguage = dimension.sharing === 'shared' ? null : language;
    const scope = useLanguage ? language.slug : 'agnostic';
    console.log(`  [dim ${dimension.id}] ${dimension.name} (${scope})`);
    const raw = await generateSeedsForDimension(openai, dimension, useLanguage);
    for (const seed of raw) {
      seeds.push({ language: scope, dimension: dimension.id, seed });
    }
  }

  return seeds;
}

function readSeedsCsv(path: string): Seed[] {
  try {
    const content = readFileSync(path, 'utf-8');
    const lines = content.trim().split('\n').slice(1);
    return lines.map(line => {
      const match = line.match(/^([^,]+),(\d+),"(.*)"$/);
      if (!match) throw new Error(`Bad seed row: ${line}`);
      return { language: match[1], dimension: parseInt(match[2], 10), seed: match[3].replace(/""/g, '"') };
    });
  } catch {
    return [];
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      language: { type: 'string', default: 'somali' },
      dimensions: { type: 'string', default: '' },
      merge: { type: 'boolean', default: false },
    },
  });
  const languageSlug = values.language!;
  const dimFilter = (values.dimensions ?? '')
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !Number.isNaN(n));
  const merge = Boolean(values.merge);

  console.log(`Generating seeds for language: ${languageSlug}`);
  if (dimFilter.length > 0) console.log(`  Filter: dimensions ${dimFilter.join(', ')}`);
  const newSeeds = await generateAllSeeds(languageSlug, dimFilter);

  mkdirSync(paths.data, { recursive: true });
  const outPath = resolve(paths.data, `seeds-${languageSlug}.csv`);

  let finalSeeds = newSeeds;
  if (merge) {
    // Keep existing seeds for dimensions NOT in filter; replace seeds for filtered dimensions.
    const existing = readSeedsCsv(outPath);
    const kept = dimFilter.length > 0
      ? existing.filter(s => !dimFilter.includes(s.dimension))
      : [];
    finalSeeds = [...kept, ...newSeeds];
    console.log(`  Merged: kept ${kept.length} existing + ${newSeeds.length} new = ${finalSeeds.length} total`);
  }

  writeFileSync(outPath, seedsToCsv(finalSeeds));
  console.log(`Wrote ${finalSeeds.length} seeds to ${outPath}`);
}

if (isMainModule(import.meta.url)) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
