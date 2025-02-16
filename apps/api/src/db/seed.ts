import fs from "fs";
import readline from "readline";
import { db } from ".";
import { wordsTable } from "./schema";
import { generateBitmask } from "../utils/bitmask";

export async function seed(props: {
  filePath: string;
  batchSize?: number;
  startBatch?: number;
}) {
  const { filePath, batchSize = 100, startBatch = 0 } = props;

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let batch: string[] = [];
  let currentBatch = 0;
  let lineNumber = 0;

  for await (const line of rl) {
    lineNumber++;
    if (currentBatch < startBatch) {
      if (lineNumber % batchSize === 0) {
        currentBatch++;
      }
      continue;
    }

    batch.push(line);
    if (batch.length >= batchSize) {
      await insertBatch(batch, currentBatch);
      batch = [];
      currentBatch++;
    }
  }

  // Insert any remaining words in the last batch
  if (batch.length > 0) {
    await insertBatch(batch, currentBatch);
  }
}

async function insertBatch(batch: string[], batchNumber: number) {
  console.log(`Inserting batch ${batchNumber}...`);
  await db.transaction(async (tx) => {
    await tx.insert(wordsTable).values(batch.map(mapWordToRow));
  });
  console.log(`Batch ${batchNumber} inserted.`);
}

function mapWordToRow(word: string): { word: string; letters: string } {
  return { word, letters: generateBitmask(word) };
}
