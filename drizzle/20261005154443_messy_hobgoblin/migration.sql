CREATE TABLE "curriculo_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"curriculo_id" uuid NOT NULL,
	"version_number" varchar(255) NOT NULL,
	"raw_content" varchar(10000) NOT NULL,
	"structured_content" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curriculos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"actual_version" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "curriculo_versions" ADD CONSTRAINT "curriculo_versions_curriculo_id_curriculos_id_fkey" FOREIGN KEY ("curriculo_id") REFERENCES "curriculos"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "curriculos" ADD CONSTRAINT "curriculos_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "curriculos" ADD CONSTRAINT "curriculos_actual_version_curriculo_versions_id_fkey" FOREIGN KEY ("actual_version") REFERENCES "curriculo_versions"("id") ON DELETE CASCADE;