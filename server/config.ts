import { z } from "zod";

const schema = z.object({
  /** TMDB v4 "API Read Access Token" (starts with eyJ) or v3 API key. */
  TMDB_API_KEY: z.string().min(1, "TMDB_API_KEY is required"),
  PORT: z.coerce.number().int().positive().default(8080),
  /** Where the SQLite file lives. Mount a volume here in Docker. */
  DATA_DIR: z.string().default("./data"),
  /** ISO 3166-1 country used for "where to watch" and age ratings. */
  REGION: z.string().length(2).toUpperCase().default("US"),
  LANGUAGE: z.string().default("en-US"),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid configuration:\n${problems.join("\n")}\nSee .env.example.`);
  }
  return parsed.data;
}
