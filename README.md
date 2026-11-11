# First100 Landing Site

The website for First100 (www.first100.org): First100: World Languages (17 languages in one app)
and the languages with their own app, starting with Somali. Read `docs/DESIGN.md` before changing a page.

## App Store availability

[First100: World Languages](https://apps.apple.com/app/id6816693260) is live with 17 languages.
`WORLD.appStoreId` in `src/data/apps.ts` controls its download badges, language availability and
Safari Smart App Banners. Prices and future packs live in `PRICING` in the same file; shared FAQ
answers in `src/data/faq.ts`.

## Production deployment

GitHub Pages builds and publishes pushes to `main` through `.github/workflows/deploy.yml`.
The reviewed `.sam-dev/deploy.json` contract publishes the current commit with a regular push
to `origin/main`. Run `dev deploy abdi-first100-landing production` for preflight, then use
`--apply` to publish after the checks below pass.

## Keeping the site in step with the app

`node scripts/sync-app-assets.mjs` copies the app's pictures, the seven families, the demo word
clips and every language's word list from the sibling `first100world` and `abdi-first100somali`
checkouts into `public/app/` and `src/data/app-words.json`. Run it after the app's words or art change.

The blog reads posts from Supabase at build time; for a local build put `PUBLIC_SUPABASE_URL` and
`PUBLIC_SUPABASE_ANON_KEY` (publishable) in `.env`.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

If deploying under a subpath (for example GitHub Pages project sites), set `ASTRO_BASE_PATH` before building:

```bash
ASTRO_BASE_PATH=/first100-landing npm run build
```

## Dev Server Manager

Use the server manager if you want the dev server to persist in the background and stop safely later.

```bash
# Start in background
npm run dev:server

# Check status
npm run dev:status

# View logs
npm run dev:logs

# Stop safely
npm run dev:stop
```

Optional environment overrides:

```bash
HOST=0.0.0.0 PORT=4322 npm run dev:server
```

## Analytics

See [website analytics](docs/ANALYTICS.md) for the App Store click event, verification
procedure and Search Console setup.

## Testing and verification

### Run tests

Tests use Node’s built-in test runner (no extra dependencies). They check:

- **`languages.json`** — Required keys, valid `status`, unique slugs, URL-safe slugs, store URLs for available languages.
- **`illustration-prompts.js`** — Exported `OBJECTS` shape, `buildPrompt`, `estimateCost`, and `getObjectById`.

```bash
npm test
```

Expected: all tests pass with no errors.

### Verify the build

After `npm install`, confirm the site builds and runs:

```bash
# 1. Install dependencies
npm install

# 2. Run data/script tests
npm test

# 3. Build the site (generates static output in dist/)
npm run build

# 4. Optional: serve the built site locally
npm run preview
```

- **Build success**: `dist/` is created and contains `index.html`, `languages/index.html`, and `l/somali/index.html` (and one `l/<slug>/index.html` per language).
- **Dev server**: `npm run dev` starts the dev server; open the URL shown (e.g. `http://localhost:4321`).

If any step fails, check Node version (>= 18 recommended) and that all files from the plan are present.

## Project Structure

```
first100-landing/
├── src/
│   ├── components/       # Reusable Astro components
│   ├── layouts/          # Page layouts
│   ├── pages/            # Route pages
│   │   ├── index.astro   # Homepage
│   │   ├── languages.astro # Language directory
│   │   ├── privacy.astro # Privacy policy
│   │   └── l/[slug].astro # Language detail template
│   ├── data/
│   │   └── languages.json # Language catalog data
│   └── styles/
│       ├── global.css    # Design tokens & base styles
│       └── motion.css    # Animation system
├── public/
│   └── illustrations/    # Generated illustration assets
├── scripts/
│   ├── generate-illustrations.js  # OpenAI image generator
│   └── illustration-prompts.js    # Prompt templates
├── test/
│   └── validate-data.test.js      # Minimal data & script tests
└── astro.config.mjs
```

## Adding Languages

Edit `src/data/languages.json` to add or modify languages:

```json
{
  "slug": "spanish",
  "name": "Spanish",
  "nativeName": "Español",
  "status": "available",        // or "coming-soon"
  "appStore": "https://...",    // null if coming soon
  "playStore": "https://...",   // null if coming soon
  "wordCount": 100,
  "featured": true              // shows on homepage
}
```

Language detail pages are automatically generated from this data.

## Generating Illustrations

The site includes an AI illustration generation pipeline using OpenAI's GPT Image model (gpt-image-1.5).

```bash
# Estimate cost (no API calls)
npm run generate-illustrations:dry-run

# Generate all illustrations
npm run generate-illustrations

# Generate specific illustrations
node scripts/generate-illustrations.js --only=apple,ball,cat

# Generate by category
node scripts/generate-illustrations.js --category=animals
```

Requires `OPENAI_API_KEY` in your environment (e.g. in a `.env` file).

**Cost estimate**: ~$1-2 for 30 illustrations at medium quality.

## Generating Localized Marketing Assets

The project includes two reference-driven image pipelines:

1. **Category visuals from screenshots + marketing references**
2. **Poster text localization from base marketing images**

### Dry run (recommended first)

```bash
# Category showcase jobs (uses edit model + all references)
npm run generate-showcase:dry-run

# Marketing localization jobs (6 templates x selected languages)
npm run generate-marketing-localizations:dry-run
```

### Generate assets

```bash
# Generate category showcase images (edit mode, no fallback)
npm run generate-showcase -- --reference-set=screens+marketing --max-jobs=24

# Generate localized marketing posters (example: Spanish + Arabic + French)
npm run generate-marketing-localizations -- --languages=spanish,arabic,french
```

### Model compatibility note

`images.edit` requires an edit-capable model. The scripts use `gpt-image-1` for edits by default because `gpt-image-1.5` may fail on the edits endpoint and force non-reference fallback generation.

### API Organization Verification

GPT Image models require **API Organization Verification** before you can generate images. If you see 404 or access-denied errors when running the script:

1. Go to [platform.openai.com](https://platform.openai.com) → **Settings** → **Organization** → **General**.
2. Complete [API Organization Verification](https://help.openai.com/en/articles/10910291-api-organization-verification) (government-issued ID, etc.).
3. Retry: `node scripts/generate-illustrations.js --only=bear`.

Without verification, the images API will reject requests even with a valid API key.

### Testing the API

To confirm image generation works:

1. Set `OPENAI_API_KEY` (e.g. in `.env` or `export OPENAI_API_KEY=sk-...`).
2. Run a single object:  
   `node scripts/generate-illustrations.js --only=bear`
3. On success, `public/illustrations/bear.png` is created and the script prints a success count. The homepage will show this image (it is preferred over the SVG fallback when present).
4. Optional — test the endpoint with curl (no `response_format` for GPT Image):

   ```bash
   curl -X POST "https://api.openai.com/v1/images/generations" \
     -H "Authorization: Bearer $OPENAI_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model": "gpt-image-1.5", "prompt": "A friendly teddy bear", "n": 1, "size": "1024x1024"}'
   ```

   A successful response includes base64 image data in `data[0].b64_json`.

## Design System

### Colors

| Token | Value | Use |
|-------|-------|-----|
| `--color-bg` | `#FFFBF7` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, elevated surfaces |
| `--color-accent` | `#4A7C59` | Primary actions, links |
| `--color-text` | `#2D2A26` | Headings, body text |
| `--color-text-muted` | `#6B6560` | Secondary text |

### Motion

- **Drift animations**: 15-22s cycles for decorative elements
- **Hover states**: Subtle lift and glow effects
- **Reduced motion**: Fully respects `prefers-reduced-motion`

## Performance Targets

- Lighthouse: 95+ on all metrics
- First Contentful Paint: < 1s
- Total JS: < 10KB (search filter only)
- All images lazy loaded

## Tech Stack

- [Astro](https://astro.build) - Static site generator
- Vanilla CSS - No CSS framework
- Vanilla JS - Minimal client-side code
- OpenAI API - Illustration generation

## License

Proprietary. All rights reserved.
