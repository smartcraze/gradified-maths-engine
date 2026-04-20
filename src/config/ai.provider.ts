import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { env } from "@/config/env";

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

export const getDefaultChatModel = () => openrouter.chat(env.MODEL_NAME);
