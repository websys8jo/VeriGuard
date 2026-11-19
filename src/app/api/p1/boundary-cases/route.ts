import { createAdminClient } from "@/lib/supabase/admin";
import { snapToGrid } from "@/lib/rules/grid";

/**
 * Texts whose BFS-found rule flips at the grid tau bracket nearest the
 * requested tau (i.e. tau_low <= tau < tau_high for the surrounding step).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tauParam = Number(searchParams.get("tau") ?? "0.3");
  const tauLow = snapToGrid(tauParam);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("p1_boundary_cases")
    .select("text_id, tau_low, tau_high, rule_id_low, rule_id_high")
    .eq("tau_low", tauLow)
    .limit(200);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json(data);
}
