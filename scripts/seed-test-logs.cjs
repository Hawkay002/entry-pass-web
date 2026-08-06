// scripts/seed-test-logs.cjs — fill the Redis activity_logs list to MAX_LOGS
// (1000) so the next real log routes to Firestore (testing the overflow).
// Run: node scripts/seed-test-logs.cjs
// Clean up afterwards with: node scripts/cleanup-test-logs.cjs

const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const MAX_LOGS = 1000;
const LOG_KEY = "activity_logs";

async function main() {
  const currentLen = Number(await redis.llen(LOG_KEY)) || 0;
  console.log(`Current Redis entries: ${currentLen}`);

  const needed = MAX_LOGS - currentLen;
  if (needed <= 0) {
    console.log(`Already at ${MAX_LOGS} — next log will route to Firestore.`);
    return;
  }

  console.log(`Adding ${needed} test entries to reach ${MAX_LOGS}...`);

  const now = Date.now();
  const BATCH = 50;
  let added = 0;

  for (let i = 0; i < needed; i += BATCH) {
    const slice = Math.min(BATCH, needed - i);
    const promises = [];
    for (let j = 0; j < slice; j++) {
      const idx = i + j;
      const entry = {
        id: `test-${now}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: now - (needed - idx) * 1000,
        userEmail: "test@entry-pass.app",
        username: "TEST_SEED",
        action: "SCAN_ENTRY",
        details: `[seed] test log #${currentLen + idx + 1}`,
      };
      promises.push(redis.lpush(LOG_KEY, JSON.stringify(entry)));
    }
    await Promise.all(promises);
    added += slice;
    process.stdout.write(`\r  added ${added}/${needed}`);
  }
  console.log("");

  // Safety trim to exactly MAX_LOGS.
  await redis.ltrim(LOG_KEY, 0, MAX_LOGS - 1);
  const finalLen = Number(await redis.llen(LOG_KEY)) || 0;
  console.log(`\nDone. Redis now has ${finalLen} entries.`);
  console.log("Next log action will route to Firestore.");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
