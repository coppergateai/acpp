import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});

export const actors = sqliteTable("actors", {
  address: text("address").primaryKey(),
  actorType: text("actor_type").notNull(),
  displayName: text("display_name").notNull(),
  status: text("status").notNull(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  verifiedAt: text("verified_at"),
  createdAt: text("created_at").notNull(),
});

export const identityKeys = sqliteTable("identity_keys", {
  keyId: text("key_id").primaryKey(),
  address: text("address")
    .notNull()
    .references(() => actors.address),
  alg: text("alg").notNull(),
  publicKey: text("public_key").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
  rotatedAt: text("rotated_at"),
});
