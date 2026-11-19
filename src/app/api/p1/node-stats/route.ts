import { createAdminClient } from "@/lib/supabase/admin";
import { snapToGrid } from "@/lib/rules/grid";

/** Per-rule top-1 accuracy at the grid tau nearest the requested one. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tauParam = Number(searchParams.get("tau") ?? "0.3");
  const tau = snapToGrid(tauParam);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("p1_node_stats")
    .select("rule_id, n_gold, n_correct")
    .eq("tau", tau);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ tau, stats: data });
}
