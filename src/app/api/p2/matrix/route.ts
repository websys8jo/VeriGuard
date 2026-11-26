import { BASELINE_MODELS, fetchModelJudgments, fetchRules, fetchTexts, rollupRuleId } from "@/lib/p2/judgments";

/**
 * Model x rule-category matrix. Query params: level (major|mid, default major),
 * source (all|dna|jigsaw), split (all|dev|test).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get("level") === "mid" ? "mid" : "major";
  const source = searchParams.get("source");
  const split = searchParams.get("split");

  try {
    const rules = await fetchRules();
    const texts = await fetchTexts({ source, split });
    const textIds = new Set(texts.map((t) => t.id));
    const textById = new Map(texts.map((t) => [t.id, t]));
    const categories = rules.filter((r) => r.level === level);

    const perModel = await Promise.all(
      BASELINE_MODELS.map(async (model) => ({ model, probs: await fetchModelJudgments(model, textIds) })),
    );

    interface Agg {
      n: number;
      sumProb: number;
      nViolation: number;
      nCorrect: number;
      nLabeled: number;
    }
    const aggByKey = new Map<string, Agg>();

    for (const { model, probs } of perModel) {
      for (const [textId, prob] of probs) {
        const text = textById.get(textId);
        if (!text?.goldRuleId) continue;
        const categoryId = rollupRuleId(text.goldRuleId, level, rules);
        if (!categoryId) continue;

        const key = `${model}\u0000${categoryId}`;
        const agg = aggByKey.get(key) ?? { n: 0, sumProb: 0, nViolation: 0, nCorrect: 0, nLabeled: 0 };
        agg.n += 1;
        agg.sumProb += prob;
        const predicted = prob >= 0.5;
        if (predicted) agg.nViolation += 1;
        if (text.humanLabel) {
          agg.nLabeled += 1;
          if (predicted === (text.humanLabel === "violation")) agg.nCorrect += 1;
        }
        aggByKey.set(key, agg);
      }
    }

    const cells = [...aggByKey].map(([key, agg]) => {
      const [model, ruleId] = key.split("\u0000");
      return {
        model,
        ruleId,
        n: agg.n,
        meanProb: agg.sumProb / agg.n,
        violationRate: agg.nViolation / agg.n,
        accuracy: agg.nLabeled > 0 ? agg.nCorrect / agg.nLabeled : null,
      };
    });

    return Response.json({
      level,
      categories: categories.map((c) => ({ id: c.id, source: c.source, ruleText: c.ruleText })),
      models: BASELINE_MODELS,
      cells,
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
