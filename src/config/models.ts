import { env } from "@/config/env";

export const modelRoles = ["questionRouter", "judgePass1", "judgePass2", "tiebreaker"] as const;

export type ModelRole = (typeof modelRoles)[number];

type ModelRoleConfig = Record<ModelRole, string>;

const defaultModels: ModelRoleConfig = {
  questionRouter: "openai/gpt-4o-mini",
  judgePass1: "anthropic/claude-sonnet-4-5",
  judgePass2: "openai/gpt-4o",
  tiebreaker: "anthropic/claude-opus-4-5",
};

export const models: ModelRoleConfig = {
  questionRouter: env.ROUTER_MODEL || defaultModels.questionRouter,
  judgePass1: env.JUDGE_PASS1_MODEL || defaultModels.judgePass1,
  judgePass2: env.JUDGE_PASS2_MODEL || defaultModels.judgePass2,
  tiebreaker: env.TIEBREAKER_MODEL || defaultModels.tiebreaker,
};

export const getModelNameForRole = (role: ModelRole): string => models[role];
