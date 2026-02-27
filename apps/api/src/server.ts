import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { createApp } from "./app";
import { env } from "./config/env";
import { pool } from "./db/pool";
import { startReminderScheduler } from "./scheduler/reminderScheduler";

let schedulerStarted = false;

async function main() {
  // quick DB ping on startup
  await pool.query("SELECT 1");

  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`✅ LifeOS API running on http://localhost:${env.PORT}`);

    // Start scheduler once (prevents duplicate cron loops in dev reload edge cases)
    if (!schedulerStarted) {
      startReminderScheduler();
      schedulerStarted = true;
      console.log("⏱️ Reminder scheduler started.");
    }
  });
}

main().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});