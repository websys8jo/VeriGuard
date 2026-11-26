import { createAdminClient } from "@/lib/supabase/admin";
import { BASELINE_MODELS, cohensKappa, fetchModelJudgments, fetchTexts } from "@/lib/p2/judgments";

/**
 * Pairwise Cohen's kappa between the 4 judgment models. Reads from the
 * `kappa_pairs` table when it has matching rows; otherwise computes live
 * from `judgments` (that table is currently empty — team_judge hasn't been
 * loaded yet — so live compute is the normal path for now).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");
  const split = searchParams.get("split");

  try {
    if (source && source !== "all" && split && split !== "all") {
      const supabase = createAdminClient();
      const { data: cached } = await supabase
        .from("kappa_pairs")
        .select("model_a, model_b, kappa, n")
        .eq("source", source)
        .eq("split", split);
      if (cached && cached.length > 0) {
        return Response.json({
          pairs: cached.map((r) => ({ modelA: r.model_a, modelB: r.model_b, kappa: r.kappa, n: r.n })),
          cached: true,
        });
      }
    }

    const texts = await fetchTexts({ source, split });
    const textIds = new Set(texts.map((t) => t.id));

    const perModel = await Promise.all(
      BASELINE_MODELS.map(async (model) => ({ model, probs: await fetchModelJudgments(model, textIds) })),
    );

    const pairs = [];
    for (let i = 0; i < perModel.length; i++) {
      for (let j = i + 1; j < perModel.length; j++) {
        const a = perModel[i];
        const b = perModel[j];
        const commonIds = [...a.probs.keys()].filter((id) => b.probs.has(id));
        const aLabels = commonIds.map((id) => a.probs.get(id)! >= 0.5);
        const bLabels = commonIds.map((id) => b.probs.get(id)! >= 0.5);
        const { kappa, n } = cohensKappa(aLabels, bLabels);
        pairs.push({ modelA: a.model, modelB: b.model, kappa, n });
      }
    }

    return Response.json({ pairs, cached: false });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
