import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { ancestorsOf, type RuleNode } from "@/lib/rules/tree";
import { BASELINE_MODELS, MODEL_CONDITION, type ModelName } from "./models";

export { BASELINE_MODELS, MODEL_CONDITION, type ModelName };

export interface RuleRow {
  id: string;
  source: "dna" | "jigsaw";
  level: "major" | "mid" | "minor";
  parentId: string | null;
  ruleText: string;
}

export interface TextMeta {
  id: string;
  source: "dna" | "jigsaw";
  split: "dev" | "test";
  goldRuleId: string | null;
  humanLabel: "violation" | "normal" | null;
}

export async function fetchRules(): Promise<RuleRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await fetchAllRows<RuleRow>(
    supabase,
    "rules",
    "id,source,level,parentId:parent_id,ruleText:rule_text",
    (q) => q.in("source", ["dna", "jigsaw"]),
  );
  if (error) throw new Error(error);
  return data;
}

export async function fetchTexts(opts: { source?: string | null; split?: string | null }): Promise<TextMeta[]> {
  const supabase = createAdminClient();
  const { data, error } = await fetchAllRows<TextMeta>(
    supabase,
    "texts",
    "id,source,split,goldRuleId:gold_rule_id,humanLabel:human_label",
    (q) => {
      let query = q.in("source", ["dna", "jigsaw"]).not("gold_rule_id", "is", null);
      if (opts.source && opts.source !== "all") query = query.eq("source", opts.source);
      if (opts.split && opts.split !== "all") query = query.eq("split", opts.split);
      return query;
    },
  );
  if (error) throw new Error(error);
  return data;
}

/** One violation_prob per text for `model`, restricted to `textIds`. */
export async function fetchModelJudgments(
  model: ModelName,
  textIds: Set<string>,
): Promise<Map<string, number>> {
  const supabase = createAdminClient();
  const condition = MODEL_CONDITION[model];
  const { data, error } = await fetchAllRows<{ text_id: string; violation_prob: number }>(
    supabase,
    "judgments",
    "text_id,violation_prob",
    (q) =>
      q
        .eq("model_name", model)
        .eq("condition", condition)
        .or("text_id.ilike.dna__%,text_id.ilike.jigsaw__%"),
  );
  if (error) throw new Error(error);
  const out = new Map<string, number>();
  for (const row of data) {
    if (textIds.has(row.text_id)) out.set(row.text_id, row.violation_prob);
  }
  return out;
}

function toRuleNodes(rules: RuleRow[]): RuleNode[] {
  return rules.map((r) => ({ id: r.id, source: r.source, level: r.level, parentId: r.parentId, ruleText: r.ruleText }));
}

/** Roll a (usually minor-level) gold rule up to its ancestor at `targetLevel`. */
export function rollupRuleId(
  ruleId: string,
  targetLevel: "major" | "mid" | "minor",
  rules: RuleRow[],
): string | null {
  const chain = ancestorsOf(toRuleNodes(rules), ruleId);
  return chain.find((n) => n.level === targetLevel)?.id ?? null;
}

/** Is `ruleId` the category itself, or does it roll up to it (at any level)? */
export function isUnderCategory(ruleId: string, categoryId: string, rules: RuleRow[]): boolean {
  if (ruleId === categoryId) return true;
  return ancestorsOf(toRuleNodes(rules), ruleId).some((n) => n.id === categoryId);
}

export function cohensKappa(a: boolean[], b: boolean[]): { kappa: number; n: number } {
  const n = a.length;
  if (n === 0) return { kappa: 0, n: 0 };
  let agree = 0;
  let aPos = 0;
  let bPos = 0;
  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) agree++;
    if (a[i]) aPos++;
    if (b[i]) bPos++;
  }
  const po = agree / n;
  const pAPos = aPos / n;
  const pBPos = bPos / n;
  const pe = pAPos * pBPos + (1 - pAPos) * (1 - pBPos);
  if (pe >= 1) return { kappa: 1, n };
  return { kappa: (po - pe) / (1 - pe), n };
}
