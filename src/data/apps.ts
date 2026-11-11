// The apps first100.org points people to, and what they cost.
//
// Going live: when Apple approves First100 World, put its App Store ID (the number in its
// App Store link, e.g. "6757512240") in WORLD.appStoreId. Every World language page, the
// homepage and the languages page switch from "Coming soon" to the App Store badge on the
// next deploy. Nothing else needs to change.
//
// New purchases (word packs, country packs) go in PRICING.tiers; every page that shows prices
// reads from here.

export interface App {
  id: 'world' | 'somali';
  name: string;
  /** App Store ID (the digits after "id" in the App Store link), or null while in review. */
  appStoreId: string | null;
}

export const WORLD: App = {
  id: 'world',
  name: 'First100: World Languages',
  appStoreId: '6816693260',
};

export const SOMALI: App = {
  id: 'somali',
  name: 'First100: Somali for Kids',
  appStoreId: '6757512240',
};

export const APPS: Record<App['id'], App> = { world: WORLD, somali: SOMALI };

export function appStoreUrl(app: App | undefined | null): string | null {
  return app?.appStoreId ? `https://apps.apple.com/app/id${app.appStoreId}` : null;
}

export interface PriceTier {
  id: string;
  name: string;
  price: string;
  detail: string;
  highlight?: boolean;
}

/** What First100 World sells. One-time purchases, no subscriptions, no ads. */
export const PRICING = {
  words: 100,
  categories: 12,
  freeCategories: 4,
  freeCategoryNames: ['Animals', 'Colors', 'Family', 'Food & Drink'],
  tiers: [
    { id: 'free', name: 'Free', price: '$0', detail: 'Animals, Colors, Family and Food & Drink, in every language.' },
    { id: 'language', name: 'One language', price: '$2.99', detail: 'All 12 categories and all 100 words in the language you choose.' },
    { id: 'all', name: 'Every language', price: '$7.99', detail: 'All 12 categories in all 17 languages. Worth it from the third language.', highlight: true },
  ] as PriceTier[],
};
