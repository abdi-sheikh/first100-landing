export type DimensionSharing = 'shared' | 'per-language' | 'hybrid' | 'skip-validation';

export interface Dimension {
  id: number;
  name: string;
  example: string;
  sharing: DimensionSharing;
  weight: number;
}

export const DIMENSIONS: Dimension[] = [
  { id: 1, name: 'Per-language intent',        example: 'learn somali for kids',            sharing: 'per-language',    weight: 1.0 },
  { id: 2, name: 'Heritage / diaspora',        example: 'raise bilingual somali kid',       sharing: 'per-language',    weight: 1.1 },
  { id: 3, name: 'Competitor brand searches',  example: 'gus on the go alternative',        sharing: 'shared',          weight: 0.9 },
  { id: 4, name: 'Horizontal pillar',          example: 'bilingual toddler benefits',       sharing: 'shared',          weight: 1.2 },
  { id: 5, name: 'How do you say X in [LANG]', example: 'how do you say water in somali',   sharing: 'skip-validation', weight: 0.7 },
  { id: 6, name: 'Age-stage parenting',        example: 'best app for 2 year old',          sharing: 'shared',          weight: 1.0 },
  { id: 7, name: 'Comparison / review',        example: 'best toddler language app 2026',   sharing: 'hybrid',          weight: 1.0 },
  { id: 8, name: 'Paywall-aligned',            example: 'free toddler language app no ads', sharing: 'shared',          weight: 1.0 },
  { id: 9, name: 'Language science & pedagogy', example: 'how do children learn language',   sharing: 'shared',          weight: 1.1 },
];

export function getDimension(id: number): Dimension {
  const d = DIMENSIONS.find(dim => dim.id === id);
  if (!d) throw new Error(`Unknown dimension id: ${id}`);
  return d;
}

export function isSharedDimension(id: number): boolean {
  return getDimension(id).sharing === 'shared';
}
