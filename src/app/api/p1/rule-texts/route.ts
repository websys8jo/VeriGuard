import { createAdminClient } from "@/lib/supabase/admin";
import { snapToGrid } from "@/lib/rules/grid";

/** Texts whose BFS-found rule (at the nearest grid tau) is this rule_id. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ruleId = searchParams.get("rule_id");
  const tau = snapToGrid(Number(searchParams.get("tau") ?? "0.3"));

  if (!ruleId) {
    return Response.json({ error: "rule_id is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("p1_rule_texts")
    .select("text_id, texts(id, source, split, human_label, raw_text)")
    .eq("rule_id", ruleId)
    .eq("tau", tau)
    .limit(200);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const texts = data.map((row) => row.texts).filter(Boolean);
  return Response.json({ tau, texts });
}
