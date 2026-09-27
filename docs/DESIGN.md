# first100.org — DESIGN.md

Read before changing a page. The site is the app's front door, so it follows the app's own
system (`first100world/DESIGN.md`): a warm picture book, not a SaaS landing page.

## What the site is for

A parent lands from a search, a post or a friend. Within one screen they should see the real
app, hear a real word in their language, and know the price. Everything else supports that.

1. **Show the product.** Real screenshots, the app's own pictures and audio (synced by
   `scripts/sync-app-assets.mjs`). No stock art, no invented UI.
2. **Only true claims.** No testimonials we don't have, no "native speakers", no features that
   aren't built. Shared answers live in `src/data/faq.ts`; prices in `src/data/apps.ts`.
3. **One price story.** 4 categories free in every language, $2.99 a language, $7.99 for all
   17, one-time. No ads, no subscriptions, no accounts.

## Tokens

Colours, spacing, radius and shadow are in `src/styles/global.css` and match the app
(paper `#FFFBF7`, ink `#2D2A26`, accent `#4A7C59`, the category tints). The accent appears only
where someone acts. Sections take a category tint as their ground (Family pink, Food yellow...).

Type is **Andika** (self-hosted via `@fontsource/andika`), 400 and 700 only. Words in other
scripts use the `.script-*` classes (system faces for CJK, Devanagari, Thai; Nastaliq for Urdu
with extra line height).

## Motion

Two moments only: the app video in the hero, and a card's pop and wiggle when tapped in
"Hear it". Nothing animates on scroll. Everything respects `prefers-reduced-motion`.

## Going live

When Apple approves First100 World, set `WORLD.appStoreId` in `src/data/apps.ts`. Every
World language page, the homepage and the languages page switch from "Coming soon" to Apple's
badge, and Safari shows its Smart App Banner. New purchases go in `PRICING.tiers`.

## Forbidden

- Apple's logo outside Apple's own badge artwork.
- Google Play links (there is no Android app yet).
- Emoji as icons; gradients as decoration; more than one accent colour.
- Floating shapes or decorative blobs; the product is the visual.
- A button that goes nowhere: an unavailable app shows "Coming soon", not a dead badge.
