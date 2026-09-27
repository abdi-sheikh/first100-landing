// Answers used on the homepage, every language page and Support. Keep them true to the app as
// shipped; when something changes (a new pack, Android), change it here once.
import { PRICING } from './apps';
import type { FaqItem } from '../components/Faq.astro';

const [, one, all] = PRICING.tiers;

export const FAQ: FaqItem[] = [
  {
    question: 'Who is First100 for?',
    answer: 'Children from about 1 to 4, and the grown-ups beside them. A child touches a picture and hears the word; there is nothing to read and nothing a small finger can tap that leaves the app.',
  },
  {
    question: 'What is free, and what do purchases unlock?',
    answer: `${PRICING.freeCategoryNames.join(', ').replace(/, ([^,]*)$/, ' and $1')} are free in every language. ${one.price} unlocks all ${PRICING.categories} categories in one language, and ${all.price} unlocks them in every language. Each is a one-time purchase: no subscription, no ads.`,
  },
  {
    question: 'Does it need the internet?',
    answer: 'No. Every picture and every word is inside the app, so it works on a plane or with no signal.',
  },
  {
    question: 'Where do the words come from?',
    answer: `${PRICING.words} first words in every language, taken from the vocabulary young children learn first and checked language by language against published dictionaries.`,
  },
  {
    question: 'Who speaks the words?',
    answer: 'A clear, natural-sounding voice chosen for each language, checked with a listening test so each word sounds like itself.',
  },
  {
    question: 'Do the pictures show families like mine?',
    answer: 'The app has seven families. Each language starts with one, and in the grown-ups area you can pick another family or show a different one each day.',
  },
  {
    question: 'Does the app collect anything about my child?',
    answer: 'No accounts, no ads and no tracking in the app. Purchases go through Apple.',
  },
  {
    question: 'Is it on Android?',
    answer: 'Not yet. First100 is on iPhone and iPad first.',
  },
];

