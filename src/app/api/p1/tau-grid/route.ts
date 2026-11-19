import { createAdminClient } from "@/lib/supabase/admin";

/** Precomputed top-1/top-3 accuracy + efficiency per (tau, source, split). ~124 rows. */
export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("p1_tau_grid")
    .select("tau, source, split, topk1_acc, topk3_acc, efficiency, n")
    .order("tau", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json(data);
}
