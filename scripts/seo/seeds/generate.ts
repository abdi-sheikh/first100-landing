import OpenAI from 'openai';
import { writeFileSync, mkdirSync } from 'node:fs';
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
    ? `Target language: ${language.name} (${language.nativeName}).`
    : 'Target: language-agnostic (applies to all toddler language apps equally).';

  return `Generate ${SEEDS_PER_DIMENSION} search-query seeds for SEO research.

Dimension: ${dimension.name}
Example of a seed in this dimension: "${dimension.example}"

${languageBlock}

Rules:
- Each seed is a realistic Google search query a parent would type.
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
  // Model may wrap array in an object key; handle both
  try {
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : (parsed.seeds ?? parsed.queries ?? parsed.keywords ?? []);
    return extractSeeds(arr);
  } catch (err) {
    console.error(`Failed to parse seeds for dimension ${dimension.id}: ${raw}`);
    throw err;
  }
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

export async function generateAllSeeds(languageSlug: string): Promise<Seed[]> {
  const openai = new OpenAI({ apiKey: env.openaiKey });
  const language = getLanguage(languageSlug);
  const seeds: Seed[] = [];

  for (const dimension of DIMENSIONS) {
    // Skip dimension 5 — no validation for long-tail programmatic
    if (dimension.sharing === 'skip-validation') continue;

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

async function main() {
  const { values } = parseArgs({
    options: { language: { type: 'string', default: 'somali' } },
  });
  const languageSlug = values.language!;
  console.log(`Generating seeds for language: ${languageSlug}`);
  const seeds = await generateAllSeeds(languageSlug);
  mkdirSync(paths.data, { recursive: true });
  const outPath = resolve(paths.data, `seeds-${languageSlug}.csv`);
  writeFileSync(outPath, seedsToCsv(seeds));
  console.log(`Wrote ${seeds.length} seeds to ${outPath}`);
}

if (isMainModule(import.meta.url)) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
