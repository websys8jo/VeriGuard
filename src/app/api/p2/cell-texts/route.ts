import { createAdminClient } from "@/lib/supabase/admin";
import { BASELINE_MODELS, fetchModelJudgments, fetchRules, fetchTexts, isUnderCategory } from "@/lib/p2/judgments";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Texts under a rule category (any level, rolled up from gold_rule_id), with
 * every model's violation_prob for side-by-side comparison. Query params:
 * rule_id (required), source, split, limit (default 100, max 300).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ruleId = searchParams.get("rule_id");
  const source = searchParams.get("source");
  const split = searchParams.get("split");
  const limit = Math.min(Number(searchParams.get("limit") ?? 100), 300);

  if (!ruleId) {
    return Response.json({ error: "rule_id required" }, { status: 400 });
  }

  try {
    const rules = await fetchRules();
    const texts = await fetchTexts({ source, split });
    const inCategory = texts
      .filter((t) => t.goldRuleId && isUnderCategory(t.goldRuleId, ruleId, rules))
      .slice(0, limit);
    const textIds = new Set(inCategory.map((t) => t.id));

    const perModel = await Promise.all(
      BASELINE_MODELS.map(async (model) => ({ model, probs: await fetchModelJudgments(model, textIds) })),
    );

    const supabase = createAdminClient();
    const idChunks = chunk([...textIds], 50);
    const rawRows = (
      await Promise.all(
        idChunks.map(async (ids) => {
          const { data, error } = await supabase.from("texts").select("id, raw_text").in("id", ids);
          if (error) throw new Error(error.message);
          return data ?? [];
        }),
      )
    ).flat();
    const rawById = new Map(rawRows.map((r) => [r.id, r.raw_text as string]));

    const items = inCategory.map((t) => {
      const raw = rawById.get(t.id) ?? "";
      const probs: Record<string, number | null> = {};
      for (const { model, probs: p } of perModel) probs[model] = p.get(t.id) ?? null;
      return {
        id: t.id,
        source: t.source,
        split: t.split,
        humanLabel: t.humanLabel,
        goldRuleId: t.goldRuleId,
        rawText: raw.length > 160 ? raw.slice(0, 160) + "…" : raw,
        probs,
      };
    });

    return Response.json({ ruleId, total: items.length, items });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
