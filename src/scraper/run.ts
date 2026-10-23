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
  let duplicates = 0;
  let failed = 0;

  for (const [index, termo] of SEARCH_TERMS.entries()) {
    if (index > 0) await sleep(DELAY_BETWEEN_REQUESTS_MS);

    console.log(`Fetching Gupy jobs for "${termo}"...`);
    const jobs = await fetchGupyJobs(termo);
    console.log(`  got ${jobs.length} jobs`);

    for (const job of jobs) {
      try {
        // Duplicates (same url_original across terms/runs) are skipped by the
        // database itself; returning() is empty when that happens.
        const rows = await db
          .insert(vagas)
          .values(job)
          .onConflictDoNothing({ target: vagas.url_original })
          .returning({ id: vagas.id });
        if (rows.length > 0) inserted++;
        else duplicates++;
      } catch (error) {
        failed++;
        console.error(`  failed to insert "${job.titulo}":`, error);
      }
    }
  }

  console.log(
    `Done. Inserted: ${inserted}, duplicates: ${duplicates}, failed: ${failed}`,
  );
  await pool.end();
}

main().catch((error) => {
  console.error("Scraper run failed:", error);
  process.exit(1);
});
