import { jsonb, numeric, text } from "drizzle-orm/pg-core";
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
  raw_content: text("raw_content").notNull(),
  structured_content: jsonb("structured_content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vagas = pgTable("vagas", {
  id: uuid("id").primaryKey().defaultRandom(),
  fonte: varchar("fonte", { length: 255 }).notNull(),
  url_original: varchar("url_original", { length: 1000 }).notNull().unique(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  empresa: varchar("empresa", { length: 255 }),
  descricao_bruta: text("descricao_bruta").notNull(),
  // Preenchido na Sprint 5 (classificação por IA); null até lá.
  requisitos_estruturados: jsonb("requisitos_estruturados"),
  localizacao: varchar("localizacao", { length: 255 }),
  nivel: varchar("nivel", { length: 255 }),
  coletado_em: timestamp("coletado_em").defaultNow().notNull(),
});

// null = análise pura (sem vaga associada); preenchido na comparação com vaga.
export const match_analises = pgTable("match_analises", {
  id: uuid("id").primaryKey().defaultRandom(),
  vaga_id: uuid("vaga_id").references(() => vagas.id, { onDelete: "set null" }),
  versao_curriculo_id: uuid("versao_curriculo_id")
    .notNull()
    .references((): AnyPgColumn => curriculo_versions.id, { onDelete: "cascade" }),
  score: numeric("score"),
  pontos_fortes: jsonb("pontos_fortes").notNull(),
  pontos_a_melhorar: jsonb("pontos_a_melhorar").notNull(),
  // Preenchidos só na comparação com vaga (Sprint 3); null na análise pura.
  vaga_colada_texto: text("vaga_colada_texto"),
  sugestoes: jsonb("sugestoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
