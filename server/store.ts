import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { MediaType, Title } from "../shared/types.ts";

export interface Profile {
  id: number;
  name: string;
}

export const MAX_PROFILES = 12;
export const MAX_NAME_LENGTH = 30;

export class StoreError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409,
  ) {
    super(message);
    this.name = "StoreError";
  }
}

/** Profiles and per-profile watchlists, kept in one SQLite file. */
export class Store {
  private readonly db: DatabaseSync;

  /** Pass ":memory:" for tests. */
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE
      );
      CREATE TABLE IF NOT EXISTS watchlist (
        profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
        tmdb_id INTEGER NOT NULL,
        title_json TEXT NOT NULL,
        added_at INTEGER NOT NULL,
        PRIMARY KEY (profile_id, media_type, tmdb_id)
      );
    `);
    // Everyone gets a profile on first run so the app works with zero setup.
    if (this.profiles().length === 0) this.createProfile("Family");
  }

  profiles(): Profile[] {
    return this.db.prepare("SELECT id, name FROM profiles ORDER BY id").all() as unknown as Profile[];
  }

  createProfile(rawName: string): Profile {
    const name = rawName.trim();
    if (!name) throw new StoreError("Name is required", 400);
    if (name.length > MAX_NAME_LENGTH) throw new StoreError(`Name must be ${MAX_NAME_LENGTH} characters or fewer`, 400);
    if (this.profiles().length >= MAX_PROFILES) throw new StoreError(`Up to ${MAX_PROFILES} profiles`, 400);
    try {
      const result = this.db.prepare("INSERT INTO profiles (name) VALUES (?)").run(name);
      return { id: Number(result.lastInsertRowid), name };
    } catch (error) {
      if (error instanceof Error && /UNIQUE/i.test(error.message)) {
        throw new StoreError("A profile with that name already exists", 409);
      }
      throw error;
    }
  }

  deleteProfile(id: number): void {
    this.requireProfile(id);
    if (this.profiles().length <= 1) throw new StoreError("Can't delete the last profile", 409);
    this.db.prepare("DELETE FROM profiles WHERE id = ?").run(id);
  }

  watchlist(profileId: number): Title[] {
    this.requireProfile(profileId);
    const rows = this.db
      .prepare("SELECT title_json FROM watchlist WHERE profile_id = ? ORDER BY added_at DESC, rowid DESC")
      .all(profileId) as unknown as { title_json: string }[];
    return rows.map((r) => JSON.parse(r.title_json) as Title);
  }

  /** Adding a title that is already there is a no-op. */
  addToWatchlist(profileId: number, title: Title, now = Date.now()): void {
    this.requireProfile(profileId);
    this.db
      .prepare(
        `INSERT OR IGNORE INTO watchlist (profile_id, media_type, tmdb_id, title_json, added_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(profileId, title.mediaType, title.id, JSON.stringify(title), now);
  }

  removeFromWatchlist(profileId: number, mediaType: MediaType, tmdbId: number): void {
    this.requireProfile(profileId);
    this.db
      .prepare("DELETE FROM watchlist WHERE profile_id = ? AND media_type = ? AND tmdb_id = ?")
      .run(profileId, mediaType, tmdbId);
  }

  close(): void {
    this.db.close();
  }

  private requireProfile(id: number): void {
    const row = this.db.prepare("SELECT 1 AS ok FROM profiles WHERE id = ?").get(id);
    if (!row) throw new StoreError("Profile not found", 404);
  }
}
