# First100 Keyword Research Pipeline

Core pipeline for phase-1 wide-shallow keyword research.

See planning docs: `grand-vision/Reference/SideProjects/First100/`

## Running

```bash
# Individual stages
npm run seo:seeds -- --language=somali
npm run seo:expand -- --language=somali
npm run seo:validate -- --language=somali
npm run seo:score -- --language=somali
npm run seo:cluster -- --language=somali
npm run seo:matrix -- --language=somali

# Full pipeline
npm run seo:run -- --language=somali
```

## Environment

Copy `.env.example` to `.env` and fill in:
- `OPENAI_API_KEY`
- `KEYWORDS_EVERYWHERE_API_KEY`

## Status (2026-04-26)

**Phase 1 research complete.** Matrices for all 22 languages exist in `output/` with drift-corrected per-language pools. Blog infrastructure live at first100.org/blog (Supabase-backed). **Ready to begin content drafting** — paused by choice while other priorities run.

When work resumes, the next steps are:
1. Build the content drafting pipeline (Ticket 1 in `grand-vision/Reference/SideProjects/First100/pending-linear-tickets.md`)
2. Draft Phase A0 pillar "When Do Babies Start Talking?" (99K monthly volume, near-zero competition) end-to-end as proof of concept
3. Iterate, then scale to Phase A → B → C → D

Drift-fix one-off scripts (`_reclassify-existing.ts`, `_compare-drift.ts`) live alongside the pipeline; they were used 2026-04-26 to backfill Tier C+D matrices. See `run-log-somali-dry-run.md` for full Ticket 6 results.
