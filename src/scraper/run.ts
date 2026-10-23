import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { vagas } from "../db/schema.js";
import { fetchGupyJobs } from "./gupy.js";

const SEARCH_TERMS = ["estagio", "desenvolvedor junior", "programador junior"];
const DELAY_BETWEEN_REQUESTS_MS = 1000; // RNF01: no hammer the source site

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool });

  let inserted = 0;
  let skipped = 0;

  for (const [index, termo] of SEARCH_TERMS.entries()) {
    if (index > 0) await sleep(DELAY_BETWEEN_REQUESTS_MS);

    console.log(`Fetching Gupy jobs for "${termo}"...`);
    const jobs = await fetchGupyJobs(termo);
    console.log(`  got ${jobs.length} jobs`);

    for (const job of jobs) {
      try {
        await db.insert(vagas).values(job);
        inserted++;
      } catch (error) {
        // ponytail: unique constraint on url_original catches duplicates across
        // terms/runs. Real dedup handling (skip query, update-on-conflict) is
        // Sprint 5 — here we just don't let one collision kill the whole run.
        skipped++;
        if (!(error instanceof Error) || !error.message.includes("unique")) {
          console.error(`  failed to insert "${job.titulo}":`, error);
        }
      }
    }
  }

  console.log(`Done. Inserted: ${inserted}, skipped (duplicate/error): ${skipped}`);
  await pool.end();
}

main().catch((error) => {
  console.error("Scraper run failed:", error);
  process.exit(1);
});
