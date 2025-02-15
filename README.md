# Word Game Backend Design (Polish Alphabet)

This document outlines the design for a word game backend that validates user-submitted words against a dictionary, given a set of allowed letters in the Polish alphabet. The primary goal is to achieve high performance and scalability.

**Important Note:** The user _does not_ need to use all the letters in the allowed set to form a valid word.

## 1. Core Concept

The user is presented with a set of letters. The user must type words that can be formed using _some_ of those letters. The backend must quickly validate if a submitted word is both a valid Polish word and can be formed using the allowed letters.

## 2. Technology Stack

- **Backend:** Hono (Typescript)
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Cache/Data Store:** Redis

## 3. Database Design (PostgreSQL)

### 3.1. Table: `words`

```sql
CREATE TABLE words (
    id SERIAL PRIMARY KEY,
    word VARCHAR(255) UNIQUE NOT NULL,
    letters VARCHAR(35) NOT NULL -- Bitmask representing letter presence/absence
);

CREATE INDEX idx_words_letters ON words (letters);
```

### 3.2. `letters` Column: Presence/Absence Bitmask

The `letters` column stores a bitmask representing the presence or absence of each letter in the Polish alphabet.

- '1' indicates the letter is present.
- '0' indicates the letter is absent.

- Example: (Illustrative - actual bitmask will be 35 characters)
  - Word: "żółw"
  - Bitmask: "000000000000000000000000000000001" (Illustrative)

### 3.3. Data Population

1.  Load the Polish dictionary.
2.  For each word:
    - Generate the bitmask.
    - Insert the word and its bitmask into the `words` table.

## 4. Backend Implementation (Hono/Typescript)

### 4.1. API Endpoint: `/api/validate-word`

- **Input:**
  - `word`: The word to validate (string).
  - `allowedLetters`: The set of allowed letters (string).
- **Output:**
  - `valid`: `true` if the word is valid, `false` otherwise.
  - `error`: (Optional) Error message.

### 4.2. Bitmask Generation

```typescript
function generateBitmask(word: string): string {
  const polishAlphabet = "aąbcćdeęfghijklłmnńoóprsśtuwxyzźż";
  let bitmask = "0".repeat(35); // Initialize with 35 zeros

  for (const char of word.toLowerCase()) {
    const index = polishAlphabet.indexOf(char);
    if (index !== -1) {
      bitmask =
        bitmask.substring(0, index) + "1" + bitmask.substring(index + 1);
    }
  }
  return bitmask;
}
```

### 4.3. Database Query (with Drizzle ORM)

```typescript
// Example Hono route
import { Hono } from "hono";
import { drizzle } from "drizzle-orm/postgres-js";
import { words } from "./db/schema";
import postgres from "postgres";

const app = new Hono();

// Database setup
const client = postgres(process.env.DATABASE_URL || "");
const db = drizzle(client);

app.post("/api/validate-word", async (c) => {
  const { word, allowedLetters } = await c.req.json<{
    word: string;
    allowedLetters: string;
  }>();

  const allowedBitmask = generateBitmask(allowedLetters);

  try {
    const result = await db.query.words.findFirst({
      where: (words, { eq, and, lte }) =>
        and(
          eq(words.word, word),
          lte(words.letters, allowedBitmask), // Crucial check
        ),
    });

    const isValid = !!result; // Convert result to boolean

    return c.json({ valid: isValid });
  } catch (error) {
    console.error("Database error:", error);
    return c.json({ valid: false, error: "Database error" }, 500);
  }
});
```

## 5. Caching Strategies (Redis)

We explored two main caching strategies:

### 5.1. Caching Valid Word Lists

- **Cache Key:** Sorted and concatenated allowed letters (e.g., `"abde"`).
- **Cache Value:** JSON array of valid words for that letter set.
- **Workflow:**
  1.  Check Redis for the cache key.
  2.  If cache hit, return the cached word list.
  3.  If cache miss, query the database, store the result in Redis with an expiration time (TTL), and return the result.

```typescript
// Example of caching valid word lists
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "");

async function getValidWordsFromDatabase(
  allowedLetters: string,
): Promise<string[]> {
  // (Adapt this to your database query logic)
  return []; // Placeholder
}

async function validateWordWithCache(
  word: string,
  allowedLetters: string,
): Promise<boolean> {
  const cacheKey = [...allowedLetters].sort().join("");

  let validWords: string[];
  const cachedWords = await redis.get(cacheKey);

  if (cachedWords) {
    validWords = JSON.parse(cachedWords);
  } else {
    validWords = await getValidWordsFromDatabase(allowedLetters);
    await redis.set(cacheKey, JSON.stringify(validWords), "EX", 3600); // 1 hour TTL
  }

  return validWords.includes(word);
}
```

### 5.2. Storing Word Sets Directly in Redis

- **Data Structure:** Redis `SET` for each letter combination.
- **Key:** Sorted and concatenated allowed letters (e.g., `"abde"`).
- **Value:** Redis `SET` containing all valid words for that letter set.
- **Workflow:**
  1.  Use `SISMEMBER` to check if the word is a member of the Redis set.

```typescript
// Example of storing word sets directly in Redis
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "");

async function validateWordWithRedisSets(
  word: string,
  allowedLetters: string,
): Promise<boolean> {
  const cacheKey = [...allowedLetters].sort().join("");
  const isMember = await redis.sismember(cacheKey, word);
  return isMember === 1;
}
```

**Note:** This approach is _much_ faster but consumes significantly more memory.

## 6. Choosing a Caching Strategy

- **Caching Valid Word Lists:**
  - **Pros:** Lower memory usage, simpler to implement.
  - **Cons:** Requires a database query on cache miss.
  - **Best For:** Scenarios where memory is a constraint and database queries are relatively fast.
- **Storing Word Sets Directly in Redis:**
  - **Pros:** Extremely fast validation (no database queries).
  - **Cons:** Higher memory usage, longer initial population time.
  - **Best For:** Scenarios where speed is paramount and memory is less of a concern.

## 7. Optimization Considerations

- **Indexing:** Create an index on the `words.letters` column in your Postgres database. This will significantly speed up the `lte` comparison.
- **Connection Pooling:** Ensure proper connection pooling for both PostgreSQL and Redis.
- **Redis Memory Management:** Configure Redis's `maxmemory-policy` (e.g., `LRU`).
- **Background Population:** Populate Redis in the background to avoid blocking application startup.
- **Client-Side Validation:** Perform basic validation on the client-side to reduce unnecessary requests.

## 8. Handling Dictionary Updates

- **Time-Based Expiration (TTL):** Set an expiration time on cached data. This is suitable for relatively infrequent dictionary updates.
- **Manual Invalidation:** When the dictionary is updated, manually delete relevant cache entries.
- **Versioned Cache Keys:** Include a version number in the cache key and increment it when the dictionary is updated.

## 9. Conclusion

This document provides a comprehensive overview of the design considerations for a word game backend. The choice of caching strategy and database query approach depends on the specific performance and memory constraints of the application. Careful monitoring and optimization are essential for ensuring a smooth and scalable user experience.
