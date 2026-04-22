export type LanguageStatus = 'live' | 'coming-soon';

export interface Language {
  slug: string;
  name: string;
  nativeName: string;
  status: LanguageStatus;
  appStore: string | null;
  playStore: string | null;
  priority: number;
}

export const LANGUAGES: Language[] = [
  { slug: 'somali',     name: 'Somali',          nativeName: 'Soomaali',         status: 'live',        appStore: 'https://apps.apple.com/app/first-100-somali-words/id123456789', playStore: 'https://play.google.com/store/apps/details?id=app.first100.somali', priority: 1.0 },
  { slug: 'spanish',    name: 'Spanish',          nativeName: 'Español',          status: 'coming-soon', appStore: null, playStore: null, priority: 0.9 },
  { slug: 'french',     name: 'French',           nativeName: 'Français',         status: 'coming-soon', appStore: null, playStore: null, priority: 0.9 },
  { slug: 'mandarin',   name: 'Mandarin Chinese', nativeName: '普通话',            status: 'coming-soon', appStore: null, playStore: null, priority: 0.9 },
  { slug: 'arabic',     name: 'Arabic',           nativeName: 'العربية',          status: 'coming-soon', appStore: null, playStore: null, priority: 0.9 },
  { slug: 'hindi',      name: 'Hindi',            nativeName: 'हिन्दी',           status: 'coming-soon', appStore: null, playStore: null, priority: 0.9 },
  { slug: 'portuguese', name: 'Portuguese',       nativeName: 'Português',        status: 'coming-soon', appStore: null, playStore: null, priority: 0.8 },
  { slug: 'russian',    name: 'Russian',          nativeName: 'Русский',          status: 'coming-soon', appStore: null, playStore: null, priority: 0.8 },
  { slug: 'japanese',   name: 'Japanese',         nativeName: '日本語',            status: 'coming-soon', appStore: null, playStore: null, priority: 0.8 },
  { slug: 'german',     name: 'German',           nativeName: 'Deutsch',          status: 'coming-soon', appStore: null, playStore: null, priority: 0.8 },
  { slug: 'korean',     name: 'Korean',           nativeName: '한국어',            status: 'coming-soon', appStore: null, playStore: null, priority: 0.8 },
  { slug: 'swahili',    name: 'Swahili',          nativeName: 'Kiswahili',        status: 'coming-soon', appStore: null, playStore: null, priority: 0.8 },
  { slug: 'vietnamese', name: 'Vietnamese',       nativeName: 'Tiếng Việt',       status: 'coming-soon', appStore: null, playStore: null, priority: 0.8 },
  { slug: 'turkish',    name: 'Turkish',          nativeName: 'Türkçe',           status: 'coming-soon', appStore: null, playStore: null, priority: 0.8 },
  { slug: 'italian',    name: 'Italian',          nativeName: 'Italiano',         status: 'coming-soon', appStore: null, playStore: null, priority: 0.8 },
  { slug: 'afrikaans',  name: 'Afrikaans',        nativeName: 'Afrikaans',        status: 'coming-soon', appStore: null, playStore: null, priority: 0.8 },
  { slug: 'amharic',    name: 'Amharic',          nativeName: 'አማርኛ',             status: 'coming-soon', appStore: null, playStore: null, priority: 0.8 },
  { slug: 'bengali',    name: 'Bengali',          nativeName: 'বাংলা',            status: 'coming-soon', appStore: null, playStore: null, priority: 0.8 },
  { slug: 'indonesian', name: 'Indonesian',       nativeName: 'Bahasa Indonesia', status: 'coming-soon', appStore: null, playStore: null, priority: 0.8 },
  { slug: 'malay',      name: 'Malay',            nativeName: 'Bahasa Melayu',    status: 'coming-soon', appStore: null, playStore: null, priority: 0.8 },
  { slug: 'thai',       name: 'Thai',             nativeName: 'ไทย',              status: 'coming-soon', appStore: null, playStore: null, priority: 0.8 },
  { slug: 'zulu',       name: 'Zulu',             nativeName: 'isiZulu',          status: 'coming-soon', appStore: null, playStore: null, priority: 0.8 },
];

export function getLanguage(slug: string): Language {
  const l = LANGUAGES.find(lang => lang.slug === slug);
  if (!l) throw new Error(`Unknown language slug: ${slug}`);
  return l;
}
