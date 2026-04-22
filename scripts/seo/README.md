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
