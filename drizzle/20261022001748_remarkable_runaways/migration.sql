CREATE TABLE "match_analises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"vaga_id" uuid,
	"versao_curriculo_id" uuid NOT NULL,
	"score" numeric,
	"pontos_fortes" jsonb NOT NULL,
	"pontos_a_melhorar" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "match_analises" ADD CONSTRAINT "match_analises_versao_curriculo_id_curriculo_versions_id_fkey" FOREIGN KEY ("versao_curriculo_id") REFERENCES "curriculo_versions"("id") ON DELETE CASCADE;