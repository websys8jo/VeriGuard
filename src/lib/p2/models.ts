// Shared between server (judgments.ts) and client components — no "server-only".

export const BASELINE_MODELS = [
  "llama_guard_3_1b",
  "qwen3guard_gen_0_6b",
  "shieldgemma_2b",
  "team_judge",
] as const;
export type ModelName = (typeof BASELINE_MODELS)[number];

export const MODEL_LABELS: Record<ModelName, string> = {
  llama_guard_3_1b: "Llama Guard 3 1B",
  qwen3guard_gen_0_6b: "Qwen3Guard-Gen-0.6B",
  shieldgemma_2b: "ShieldGemma-2B",
  team_judge: "팀 판정기",
};

export const MODEL_SHORT_LABELS: Record<ModelName, string> = {
  llama_guard_3_1b: "Llama Guard",
  qwen3guard_gen_0_6b: "Qwen3Guard",
  shieldgemma_2b: "ShieldGemma",
  team_judge: "팀 판정기",
};

// Which (model_name, condition) row represents "this model's call" for a text.
// llama_guard/qwen3guard aren't rule-conditioned (rule_id is null, one row per
// text). shieldgemma/team_judge take a rule sentence as input, so we pick the
// condition that pairs each text 1:1 with its own gold rule — rule_sentence_only
// for shieldgemma (verified to always match gold_rule_id), default for
// team_judge (the BFS-found rule, once that load step runs).
export const MODEL_CONDITION: Record<ModelName, string> = {
  llama_guard_3_1b: "default",
  qwen3guard_gen_0_6b: "default",
  shieldgemma_2b: "rule_sentence_only",
  team_judge: "default",
};
