import { bit, index, integer, pgTable, varchar } from "drizzle-orm/pg-core";

export const wordsTable = pgTable(
  "words",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    word: varchar({ length: 255 }).notNull().unique(),
    letters: bit({ dimensions: 35 }).notNull(),
  },
  (table) => [
    index("idx_word").on(table.word),
    index("idx_letters").on(table.letters),
  ],
);
