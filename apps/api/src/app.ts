import path from "path";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { seed } from "./db/seed";
import { generateBitmask } from "./utils/bitmask";
import { db } from "./db";

export const app = new Hono()
  .post("/db/seed", async (c) => {
    const seedDataFilePath = path.join(import.meta.dirname, "temp/words.txt");
    const startTime = performance.now();
    try {
      await seed({
        filePath: seedDataFilePath,
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
  })
  .get("/validate/:word", async (c) => {
    const word = c.req.param("word");
    const letters = c.req.query("letters");
    if (!letters) {
      return c.json({ error: "Missing letters query parameter" }, 400);
    }

    const allowedBitmask = generateBitmask(letters);

    try {
      const startTime = performance.now();

      const result = await db.query.wordsTable.findFirst({
        where: (words, { eq, and, sql }) =>
          and(
            eq(words.word, word),
            // The bitmask comparison is performed using a bitwise AND operation to ensure that
            // the word's letters are a subset of the allowed letters.
            sql`${words.letters} & ${allowedBitmask} = ${words.letters}`,
          ),
      });

      return c.json({
        valid: result !== undefined,
        timeMs: performance.now() - startTime,
      });
    } catch (error) {
      console.error("Database error:", error);
      return c.json({ valid: false, error: "Database error" }, 500);
    }
  });

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
