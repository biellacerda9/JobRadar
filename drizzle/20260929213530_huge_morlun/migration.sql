CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL UNIQUE,
	"password_hash" varchar(255) NOT NULL,
	"chat_id_telegram" varchar(255) UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL
);
