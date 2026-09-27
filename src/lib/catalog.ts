// Every language on the site, joined with the app it lives in and whether that app can be
// downloaded yet. Pages read languages from here, never from languages.json directly, so a
// language's status always follows its app (see data/apps.ts).

import languageData from '../data/languages.json';
import { APPS, appStoreUrl, type App } from '../data/apps';

export type LanguageApp = 'world' | 'somali' | 'standalone';

export interface Language {
  slug: string;
  code: string;
  name: string;
  nativeName: string;
  app: LanguageApp;
  featured: boolean;
  wordCount: number;
  /** 'available' once its app is on the App Store. */
  status: 'available' | 'coming-soon';
  /** The App Store link for its app, or null while it is not out yet. */
  appStore: string | null;
  /** The app's name, or null for a standalone app not yet named. */
  appName: string | null;
}

function appFor(app: LanguageApp): App | null {
  return app === 'standalone' ? null : APPS[app];
}

export const LANGUAGES: Language[] = (languageData.languages as Omit<Language, 'status' | 'appStore' | 'appName'>[]).map((l) => {
  const app = appFor(l.app);
  const appStore = appStoreUrl(app);
  return { ...l, status: appStore ? 'available' : 'coming-soon', appStore, appName: app?.name ?? null };
});

export const WORLD_LANGUAGES = LANGUAGES.filter((l) => l.app === 'world');
export const OWN_APP_LANGUAGES = LANGUAGES.filter((l) => l.app !== 'world');

export function languageBySlug(slug: string | null | undefined): Language | undefined {
  return slug ? LANGUAGES.find((l) => l.slug === slug) : undefined;
}

/** Scripts that need their own typeface on the site (Andika covers Latin, Cyrillic, Vietnamese). */
export function scriptClass(code: string): string {
  return ({ zh: 'script-cjk', ja: 'script-cjk', ko: 'script-cjk', hi: 'script-deva', bn: 'script-beng', th: 'script-thai', ur: 'script-urdu', ar: 'script-arab', am: 'script-ethi' } as Record<string, string>)[code] ?? '';
}
