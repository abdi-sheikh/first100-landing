import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { paths, isMainModule } from './lib/config.js';
import { LANGUAGE_ANCHORS } from './lib/language-anchors.js';

export interface CliArgs {
  language: string;
  skip: string[];
  dryRun: boolean;
}

export function parseCliArgs(argv: string[]): CliArgs {
  const { values } = parseArgs({
    args: argv,
    options: {
      language: { type: 'string' },
      skip: { type: 'string', default: '' },
      'dry-run': { type: 'boolean', default: false },
    },
  });
  if (!values.language) throw new Error('--language is required');
  return {
    language: values.language,
    skip: (values.skip ?? '').split(',').map(s => s.trim()).filter(Boolean),
    dryRun: Boolean(values['dry-run']),
  };
}

const STAGES = [
  { name: 'seeds',    script: 'scripts/seo/seeds/generate.ts' },
  { name: 'expand',   script: 'scripts/seo/expand/autocomplete.ts' },
  { name: 'validate', script: 'scripts/seo/validate/ke.ts' },
  { name: 'score',    script: 'scripts/seo/score/prioritize.ts' },
  { name: 'cluster',  script: 'scripts/seo/score/cluster.ts' },
  { name: 'matrix',   script: 'scripts/seo/export/matrix.ts' },
] as const;

function runStage(stage: string, script: string, language: string, dryRun: boolean): void {
  const args = ['tsx', resolve(paths.seoRoot, '..', '..', script), `--language=${language}`];
  if (dryRun && stage === 'validate') args.push('--dry-run');
  console.log(`\n=== Stage: ${stage} ===`);
  const result = spawnSync('npx', args, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`Stage "${stage}" failed with exit code ${result.status}`);
  }
}

function emitFinalQualityReport(language: string): void {
  if (!LANGUAGE_ANCHORS[language]) return;
  const candidatesPath = resolve(paths.data, `candidates-${language}.csv`);
  let total = 0;
  let langSpecific = 0;
  let agnostic = 0;
  try {
    const lines = readFileSync(candidatesPath, 'utf-8').trim().split('\n').slice(1);
    for (const line of lines) {
      const match = line.match(/^"(.*)",([^,]+),(\d+),"(.*)"$/);
      if (!match) continue;
      total++;
      if (match[2] === language) langSpecific++;
      else if (match[2] === 'agnostic') agnostic++;
    }
  } catch {
    return;
  }
  const denom = langSpecific + agnostic;
  const driftRatio = denom === 0 ? 0 : agnostic / denom;
  console.log(`\n=== Pipeline quality report (${language}) ===`);
  console.log(`  candidates total: ${total}`);
  console.log(`  language-specific: ${langSpecific}`);
  console.log(`  agnostic (post-reclassification): ${agnostic}`);
  console.log(`  drift ratio: ${(driftRatio * 100).toFixed(1)}%`);
  if (driftRatio > 0.5 && langSpecific > 0) {
    console.warn(`  ⚠ drift ratio above 50% — per-language pool may be unreliable`);
  }
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  console.log(`Running SEO pipeline for language: ${args.language}`);
  if (args.dryRun) console.log('(dry-run mode: validate stage will not spend credits)');

  for (const stage of STAGES) {
    if (args.skip.includes(stage.name)) {
      console.log(`\n=== Skipping: ${stage.name} ===`);
      continue;
    }
    runStage(stage.name, stage.script, args.language, args.dryRun);
  }
  emitFinalQualityReport(args.language);
  console.log('\nPipeline complete.');
}

if (isMainModule(import.meta.url)) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
