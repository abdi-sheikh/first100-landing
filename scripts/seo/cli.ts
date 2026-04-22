import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { paths } from './lib/config.js';

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
  console.log('\nPipeline complete.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
