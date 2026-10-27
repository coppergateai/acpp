import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { migrateIdentitySchema } from "./migrate.js";
import * as schema from "./schema.js";

export type ActorRow = {
  address: string;
  actorType: string;
  displayName: string;
  status: string;
  workspaceId: string;
  verifiedAt: string | null;
  createdAt: string;
};

export type IdentityKeyRow = {
  keyId: string;
  address: string;
  alg: string;
  publicKey: string;
  status: string;
  createdAt: string;
  rotatedAt: string | null;
};

export type IdentityDb = {
  sqlite: Database.Database;
  orm: BetterSQLite3Database<typeof schema>;
  store: IdentityStore;
};

export class IdentityStore {
  constructor(private readonly db: BetterSQLite3Database<typeof schema>) {}

  createWorkspace(id: string, name: string, createdAt: string): void {
    this.db.insert(schema.workspaces).values({ id, name, createdAt }).run();
  }

  getWorkspace(id: string): { id: string; name: string; createdAt: string } | undefined {
    const row = this.db
      .select()
      .from(schema.workspaces)
      .where(eq(schema.workspaces.id, id))
      .get();
    if (!row) return undefined;
    return { id: row.id, name: row.name, createdAt: row.createdAt };
  }

  insertActor(row: ActorRow): void {
    this.db
      .insert(schema.actors)
      .values({
        address: row.address,
        actorType: row.actorType,
        displayName: row.displayName,
        status: row.status,
        workspaceId: row.workspaceId,
        verifiedAt: row.verifiedAt,
        createdAt: row.createdAt,
      })
      .run();
  }

  getActor(address: string): ActorRow | undefined {
    const row = this.db
      .select()
      .from(schema.actors)
      .where(eq(schema.actors.address, address))
      .get();
    if (!row) return undefined;
    return {
      address: row.address,
      actorType: row.actorType,
      displayName: row.displayName,
      status: row.status,
      workspaceId: row.workspaceId,
      verifiedAt: row.verifiedAt ?? null,
      createdAt: row.createdAt,
    };
  }

  updateActorStatus(
    address: string,
    status: string,
    verifiedAt?: string | null,
  ): void {
    this.db
      .update(schema.actors)
      .set({
        status,
        ...(verifiedAt !== undefined ? { verifiedAt } : {}),
      })
      .where(eq(schema.actors.address, address))
      .run();
  }

  insertKey(row: IdentityKeyRow): void {
    this.db
      .insert(schema.identityKeys)
      .values({
        keyId: row.keyId,
        address: row.address,
        alg: row.alg,
        publicKey: row.publicKey,
        status: row.status,
        createdAt: row.createdAt,
        rotatedAt: row.rotatedAt,
      })
      .run();
  }

  getKey(keyId: string): IdentityKeyRow | undefined {
    const row = this.db
      .select()
      .from(schema.identityKeys)
      .where(eq(schema.identityKeys.keyId, keyId))
      .get();
    if (!row) return undefined;
    return {
      keyId: row.keyId,
      address: row.address,
      alg: row.alg,
      publicKey: row.publicKey,
      status: row.status,
      createdAt: row.createdAt,
      rotatedAt: row.rotatedAt ?? null,
    };
  }

  listKeysForAddress(address: string): IdentityKeyRow[] {
    return this.db
      .select()
      .from(schema.identityKeys)
      .where(eq(schema.identityKeys.address, address))
      .all()
      .map((row) => ({
        keyId: row.keyId,
        address: row.address,
        alg: row.alg,
        publicKey: row.publicKey,
        status: row.status,
        createdAt: row.createdAt,
        rotatedAt: row.rotatedAt ?? null,
      }));
  }

  updateKeyStatus(
    keyId: string,
    status: string,
    rotatedAt?: string | null,
  ): void {
    this.db
      .update(schema.identityKeys)
      .set({
        status,
        ...(rotatedAt !== undefined ? { rotatedAt } : {}),
      })
      .where(eq(schema.identityKeys.keyId, keyId))
      .run();
  }
}

export function createIdentityDb(options?: {
  filename?: string;
}): IdentityDb {
  const filename = options?.filename ?? ":memory:";
  const sqlite = new Database(filename);
  sqlite.pragma("foreign_keys = ON");
  migrateIdentitySchema(sqlite);
  const orm = drizzle(sqlite, { schema });
  const store = new IdentityStore(orm);
  return { sqlite, orm, store };
}
