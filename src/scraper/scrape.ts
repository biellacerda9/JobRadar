import { eq, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { vagas } from "../db/schema.js";
import { classificarStack } from "./classificar.js";
import { fetchGupyJobs } from "./gupy.js";

const SEARCH_TERMS = ["estagio", "desenvolvedor junior", "programador junior"];
const DELAY_BETWEEN_REQUESTS_MS = 1000; // RNF01: don't hammer the source site

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * One scrape cycle: fetches every search term, inserts new jobs (duplicates are
 * skipped by the url_original unique index), then classifies the stack of every job
 * that doesn't have one yet — which also backfills jobs from earlier runs.
 */
export async function runScrape(db: NodePgDatabase) {
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

  const pending = await db
    .select({ id: vagas.id, descricao: vagas.descricao_bruta })
    .from(vagas)
    .where(isNull(vagas.requisitos_estruturados));

  for (const vaga of pending) {
    await db
      .update(vagas)
      .set({ requisitos_estruturados: { stack: classificarStack(vaga.descricao) } })
      .where(eq(vagas.id, vaga.id));
  }

  return { inserted, duplicates, failed, classified: pending.length };
}
