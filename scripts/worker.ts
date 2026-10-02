import "dotenv/config";
import { db } from "../src/lib/db";
import { maintenance } from "../src/lib/maintenance";
if (!process.env.DATABASE_URL) {
  console.log("Worker disabled: DATABASE_URL is not configured.");
  process.exit(0);
}
let busy = false;
async function tick() {
  if (busy) return;
  busy = true;
  try {
    await maintenance();
  } catch {
    console.error("Maintenance failed; retrying on the next tick.");
  } finally {
    busy = false;
  }
}
await tick();
const timer = setInterval(tick, 15000);
async function shutdown() {
  clearInterval(timer);
  await db.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
console.log("Community maintenance worker ready.");
