import Database from 'better-sqlite3';
import type { ValidatedKeyword } from '../lib/types.js';

const TTL_DAYS = 90;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

export type Cache = Database.Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS keywords (
  keyword TEXT NOT NULL,
  country TEXT NOT NULL,
  data_source TEXT NOT NULL,
  language TEXT NOT NULL,
  dimension INTEGER NOT NULL,
  volume INTEGER NOT NULL,
  cpc REAL NOT NULL,
  competition REAL NOT NULL,
  trend_12mo TEXT NOT NULL,
  sources TEXT NOT NULL,
  validated_at TEXT NOT NULL,
  PRIMARY KEY (keyword, country, data_source)
);
CREATE INDEX IF NOT EXISTS idx_language_dim ON keywords (language, dimension);
`;

export function openCache(path: string): Cache {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);
  return db;
}

export function closeCache(cache: Cache): void {
  cache.close();
}

export function getCached(
  cache: Cache,
  keyword: string,
  country: string,
  dataSource: string,
): ValidatedKeyword | null {
  const row = cache
    .prepare(`SELECT * FROM keywords WHERE keyword = ? AND country = ? AND data_source = ?`)
    .get(keyword, country, dataSource) as Record<string, unknown> | undefined;
  if (!row) return null;

  const validatedAt = new Date(String(row.validated_at));
  if (Date.now() - validatedAt.getTime() > TTL_MS) return null;

  return {
    keyword: String(row.keyword),
    language: String(row.language),
    dimension: Number(row.dimension),
    volume: Number(row.volume),
    cpc: Number(row.cpc),
    competition: Number(row.competition),
    trend12mo: JSON.parse(String(row.trend_12mo)),
    sources: JSON.parse(String(row.sources)),
    country: String(row.country),
    dataSource: String(row.data_source),
    validatedAt: String(row.validated_at),
  };
}

export function putCached(cache: Cache, kw: ValidatedKeyword): void {
  cache
    .prepare(`
      INSERT OR REPLACE INTO keywords
      (keyword, country, data_source, language, dimension, volume, cpc, competition, trend_12mo, sources, validated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      kw.keyword,
      kw.country,
      kw.dataSource,
      kw.language,
      kw.dimension,
      kw.volume,
      kw.cpc,
      kw.competition,
      JSON.stringify(kw.trend12mo),
      JSON.stringify(kw.sources),
      kw.validatedAt,
    );
}

export function listByLanguage(cache: Cache, language: string): ValidatedKeyword[] {
  const cutoff = new Date(Date.now() - TTL_MS).toISOString();
  const rows = cache
    .prepare(`SELECT * FROM keywords WHERE language = ? AND validated_at > ?`)
    .all(language, cutoff) as Record<string, unknown>[];
  return rows.map(row => ({
    keyword: String(row.keyword),
    language: String(row.language),
    dimension: Number(row.dimension),
    volume: Number(row.volume),
    cpc: Number(row.cpc),
    competition: Number(row.competition),
    trend12mo: JSON.parse(String(row.trend_12mo)),
    sources: JSON.parse(String(row.sources)),
    country: String(row.country),
    dataSource: String(row.data_source),
    validatedAt: String(row.validated_at),
  }));
}
