CREATE TABLE "vagas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"fonte" varchar(255) NOT NULL,
	"url_original" varchar(1000) NOT NULL UNIQUE,
	"titulo" varchar(255) NOT NULL,
	"empresa" varchar(255),
	"descricao_bruta" text NOT NULL,
	"requisitos_estruturados" jsonb,
	"localizacao" varchar(255),
	"nivel" varchar(255),
	"coletado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "match_analises" ADD CONSTRAINT "match_analises_vaga_id_vagas_id_fkey" FOREIGN KEY ("vaga_id") REFERENCES "vagas"("id") ON DELETE SET NULL;