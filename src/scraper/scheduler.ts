/**
 * Runs `task` right away and then every `intervalMs`. A tick that arrives while the
 * previous run is still going is skipped, and a failed run is logged without
 * stopping the loop. Returns a function that stops the schedule.
 */
export function startScheduler(
  task: () => Promise<void>,
  intervalMs: number,
): () => void {
  let running = false;

  const tick = async () => {
    if (running) {
      console.log("Previous run still in progress, skipping this tick");
      return;
    }
    running = true;
    try {
      await task();
    } catch (error) {
      console.error("Scheduled run failed:", error);
    } finally {
      running = false;
    }
  };

  void tick();
  const timer = setInterval(() => void tick(), intervalMs);
  return () => clearInterval(timer);
}
