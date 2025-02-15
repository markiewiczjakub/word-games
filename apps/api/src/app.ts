import { serve } from "@hono/node-server";
import { Hono } from "hono";

export const app = new Hono().get("/", (c) => {
  return c.text("hello, world");
});

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
