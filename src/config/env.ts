import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("3000"),
  OPENROUTER_API_KEY: z.string(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  ROUTER_MODEL: z.string().default("openai/gpt-4o-mini"),
  JUDGE_PASS1_MODEL: z.string().default("anthropic/claude-sonnet-4-5"),
  JUDGE_PASS2_MODEL: z.string().default("openai/gpt-4o"),
  TIEBREAKER_MODEL: z.string().default("anthropic/claude-opus-4-5"),
  CONSENSUS_THRESHOLD: z.coerce.number().positive().default(1),
});

export type Env = z.infer<typeof envSchema>;

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const missing = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  console.warn(`[env] Missing or invalid environment variables:\n${missing}`);
}

export const env = (result.success ? result.data : process.env) as Env;
