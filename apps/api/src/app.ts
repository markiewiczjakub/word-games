import path from "path";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { seed } from "./db/seed";

const SEED_DATA_FILE_PATH = path.join(import.meta.dirname, "temp/words.txt");
export const app = new Hono().post("/db/seed", async (c) => {
  const startTime = performance.now();
  try {
    await seed({
      filePath: SEED_DATA_FILE_PATH,
      batchSize: 10000,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: errorMessage }, 500);
  }

  return c.json({
    message: `Seed completed in ${performance.now() - startTime} ms`,
  });
});

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
