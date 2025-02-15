import { app } from "./app";
import { hc } from "hono/client";

export const hcWithType = (...args: Parameters<typeof hc>) =>
  hc<typeof app>(...args);
export type Client = ReturnType<typeof hcWithType>;
