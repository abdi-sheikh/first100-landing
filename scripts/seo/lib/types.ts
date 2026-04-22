export interface Seed {
  language: string;   // 'somali' or 'agnostic' for shared dimensions
  dimension: number;  // 1-8
  seed: string;
}

export interface Candidate {
  keyword: string;
  language: string;
  dimension: number;
  sources: string[];  // ['autocomplete', 'paa', ...]
}

export interface ValidatedKeyword {
  keyword: string;
  language: string;
  dimension: number;
  volume: number;
  cpc: number;
  competition: number;
  trend12mo: number[];
  sources: string[];
  country: string;
  dataSource: string;
  validatedAt: string; // ISO timestamp
}

export interface Cluster {
  clusterId: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  language: string;
  dimension: number;
  volumeSum: number;
  maxCpc: number;
  avgCompetition: number;
  priorityScore: number;
  suggestedContentType: 'pillar' | 'landing-page' | 'programmatic';
  tier: 1 | 2 | 3 | 4;
}
