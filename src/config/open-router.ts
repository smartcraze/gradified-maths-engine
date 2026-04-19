import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { env } from "@/config/env";
import { getModelNameForRole, type ModelRole } from "@/config/models";

const openRouterProvider = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

export const getOpenRouterModelName = (role: ModelRole): string => getModelNameForRole(role);

export const getOpenRouterModelForRole = (role: ModelRole) => openRouterProvider.chat(getOpenRouterModelName(role));
