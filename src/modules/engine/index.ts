// test code for openrouter ai sdk provider

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { env } from "@/config/env";

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

const { text } = await generateText({
  model: openrouter.chat("openai/gpt-oss-120b:free"),
  prompt: "Write a short story about AI.",
});

console.log(text);
