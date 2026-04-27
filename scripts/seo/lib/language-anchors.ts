// Per-language anchor tokens. A keyword is considered "anchored" to a language
// if it contains any of the language's anchor tokens (case-insensitive substring
// for native-script tokens, word-boundary match for Latin-script tokens).
//
// Anchors are deliberately conservative: only language-name variants and direct
// endonyms. Country and demonym tokens (e.g., "tanzania", "japanese culture") are
// excluded because they generate too many false positives unrelated to the
// target language.
//
// Used by:
// - scripts/seo/seeds/generate.ts (validates LLM-generated seeds anchor the language)
// - scripts/seo/expand/autocomplete.ts (reclassifies drifted candidates to agnostic)

export interface LanguageAnchors {
  // Latin-script tokens, matched as whole words (case-insensitive).
  latin: string[];
  // Native-script tokens, matched as substrings (case-insensitive).
  native: string[];
}

export const LANGUAGE_ANCHORS: Record<string, LanguageAnchors> = {
  somali:     { latin: ['somali', 'soomaali'],            native: [] },
  spanish:    { latin: ['spanish', 'español', 'espanol'], native: [] },
  french:     { latin: ['french', 'français', 'francais'], native: [] },
  mandarin:   { latin: ['mandarin', 'chinese', 'putonghua'], native: ['中文', '汉语', '漢語', '普通话', '普通話'] },
  arabic:     { latin: ['arabic'],                        native: ['العربية', 'عربي', 'عربية'] },
  hindi:      { latin: ['hindi'],                         native: ['हिन्दी', 'हिंदी'] },
  portuguese: { latin: ['portuguese', 'português', 'portugues'], native: [] },
  russian:    { latin: ['russian'],                       native: ['русский', 'русский язык'] },
  japanese:   { latin: ['japanese', 'nihongo'],           native: ['日本語'] },
  german:     { latin: ['german', 'deutsch'],             native: [] },
  korean:     { latin: ['korean', 'hangul'],              native: ['한국어', '한글'] },
  swahili:    { latin: ['swahili', 'kiswahili'],          native: [] },
  vietnamese: { latin: ['vietnamese', 'tiếng việt', 'tieng viet'], native: [] },
  turkish:    { latin: ['turkish', 'türkçe', 'turkce'],   native: [] },
  italian:    { latin: ['italian', 'italiano'],           native: [] },
  afrikaans:  { latin: ['afrikaans'],                     native: [] },
  amharic:    { latin: ['amharic'],                       native: ['አማርኛ'] },
  bengali:    { latin: ['bengali', 'bangla'],             native: ['বাংলা'] },
  indonesian: { latin: ['indonesian', 'bahasa indonesia'], native: [] },
  malay:      { latin: ['malay', 'bahasa melayu'],        native: [] },
  thai:       { latin: ['thai'],                          native: ['ไทย', 'ภาษาไทย'] },
  zulu:       { latin: ['zulu', 'isizulu'],               native: [] },
};

const wordBoundaryCache = new Map<string, RegExp>();

function compileLatinAnchor(token: string): RegExp {
  const cached = wordBoundaryCache.get(token);
  if (cached) return cached;
  // Escape regex specials. Use \b for word-boundary matching.
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b${escaped}\\b`, 'i');
  wordBoundaryCache.set(token, re);
  return re;
}

export function hasLanguageAnchor(keyword: string, languageSlug: string): boolean {
  const anchors = LANGUAGE_ANCHORS[languageSlug];
  if (!anchors) {
    throw new Error(`No anchor list for language slug: ${languageSlug}`);
  }
  for (const token of anchors.latin) {
    if (compileLatinAnchor(token).test(keyword)) return true;
  }
  if (anchors.native.length > 0) {
    const lower = keyword.toLowerCase();
    for (const token of anchors.native) {
      if (lower.includes(token.toLowerCase())) return true;
    }
  }
  return false;
}

export function getAnchorTokens(languageSlug: string): string[] {
  const anchors = LANGUAGE_ANCHORS[languageSlug];
  if (!anchors) throw new Error(`No anchor list for language slug: ${languageSlug}`);
  return [...anchors.latin, ...anchors.native];
}
