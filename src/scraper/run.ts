import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { runScrape } from "./scrape.js";
import { startScheduler } from "./scheduler.js";

// Usage:
//   npm run scrape            -> one cycle, then exit
//   npm run scrape:schedule   -> one cycle now, then every SCRAPE_INTERVAL_HOURS (default 6)

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function cycle() {
  const result = await runScrape(db);
  console.log(
    `Done. Inserted: ${result.inserted}, duplicates: ${result.duplicates}, ` +
      `failed: ${result.failed}, classified: ${result.classified}`,
  );
}

if (process.argv.includes("--schedule")) {
  const hours = Number(process.env.SCRAPE_INTERVAL_HOURS ?? 6);
  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error(`Invalid SCRAPE_INTERVAL_HOURS: ${process.env.SCRAPE_INTERVAL_HOURS}`);
  }

  console.log(`Scheduler started: scraping every ${hours}h`);
  const stop = startScheduler(cycle, hours * 60 * 60 * 1000);

  const shutdown = () => {
    stop();
    void pool.end().then(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
} else {
  cycle()
    .catch((error) => {
      console.error("Scraper run failed:", error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
