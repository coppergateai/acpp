import type Database from "better-sqlite3";

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS actors (
  address TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  verified_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS identity_keys (
  key_id TEXT PRIMARY KEY,
  address TEXT NOT NULL REFERENCES actors(address),
  alg TEXT NOT NULL,
  public_key TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  rotated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_identity_keys_address ON identity_keys(address);
CREATE INDEX IF NOT EXISTS idx_actors_workspace ON actors(workspace_id);
`;

export function migrateIdentitySchema(sqlite: Database.Database): void {
  sqlite.exec(MIGRATION_SQL);
}
