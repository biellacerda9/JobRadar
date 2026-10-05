import { jsonb } from "drizzle-orm/pg-core";
import { pgTable, varchar, timestamp, uuid } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password_hash: varchar("password_hash", { length: 255 }).notNull(),
  chat_id_telegram: varchar("chat_id_telegram", { length: 255 }).unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const curriculos = pgTable("curriculos", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  actual_version: uuid("actual_version").references(
    (): AnyPgColumn => curriculo_versions.id,
    {
      onDelete: "cascade",
    },
  ),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const curriculo_versions = pgTable("curriculo_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  curriculo_id: uuid("curriculo_id")
    .notNull()
    .references((): AnyPgColumn => curriculos.id, { onDelete: "cascade" }),
  version_number: varchar("version_number", { length: 255 }).notNull(),
  raw_content: varchar("raw_content", { length: 10000 }).notNull(),
  structured_content: jsonb("structured_content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
