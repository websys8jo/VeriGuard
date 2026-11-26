import { fetchModelJudgments, fetchRules, fetchTexts, isUnderCategory, type ModelName } from "@/lib/p2/judgments";

/**
 * Per-text violation_prob pairs for two models, for a disagreement scatter.
 * Query params: model_a, model_b (required), source, split, rule_id (optional
 * category filter).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const modelA = searchParams.get("model_a") as ModelName | null;
  const modelB = searchParams.get("model_b") as ModelName | null;
  const source = searchParams.get("source");
  const split = searchParams.get("split");
  const ruleId = searchParams.get("rule_id");

  if (!modelA || !modelB) {
    return Response.json({ error: "model_a, model_b required" }, { status: 400 });
  }

  try {
    const texts = await fetchTexts({ source, split });
    let filtered = texts;
    if (ruleId) {
      const rules = await fetchRules();
      filtered = texts.filter((t) => t.goldRuleId && isUnderCategory(t.goldRuleId, ruleId, rules));
    }
    const textIds = new Set(filtered.map((t) => t.id));
    const textById = new Map(filtered.map((t) => [t.id, t]));

    const [probsA, probsB] = await Promise.all([
      fetchModelJudgments(modelA, textIds),
      fetchModelJudgments(modelB, textIds),
    ]);

    const points = [];
    for (const id of textIds) {
      const a = probsA.get(id);
      const b = probsB.get(id);
      if (a === undefined || b === undefined) continue;
      const t = textById.get(id)!;
      points.push({
        textId: id,
        probA: a,
        probB: b,
        humanLabel: t.humanLabel,
        goldRuleId: t.goldRuleId,
      });
    }

    return Response.json({ modelA, modelB, points });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
