import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("3000"),
  OPENROUTER_API_KEY: z.string(),
  MODEL_NAME: z.string().default("openai/gpt-oss-120b:free"),
});

export type Env = z.infer<typeof envSchema>;

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const missing = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  console.warn(`[env] Missing or invalid environment variables:\n${missing}`);
}

export const env = (result.success ? result.data : process.env) as Env;
