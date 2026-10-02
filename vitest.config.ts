import "dotenv/config";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const url = process.env.TEST_DATABASE_URL;
if (
  !url ||
  url === process.env.DATABASE_URL ||
  !new URL(url).pathname.includes("test")
)
  throw new Error(
    "Set TEST_DATABASE_URL to a separate PostgreSQL database whose name contains 'test'. Tests never use the application database.",
  );
process.env.DATABASE_URL = url;
execFileSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" },
);
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 15000,
    env: {
      DATABASE_URL: url,
      SESSION_SECRET: "test-only-secret-not-a-production-credential-123456789",
      APP_URL: "http://localhost:3000",
    },
  },
});
