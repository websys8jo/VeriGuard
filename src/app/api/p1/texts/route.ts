import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Lightweight list for the text picker. Query params: source, split, gold_rule_id
 * (optional filters), q (search in id/raw_text), limit (default 200, max 500).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");
  const split = searchParams.get("split");
  const goldRuleId = searchParams.get("gold_rule_id");
  const q = searchParams.get("q");
  const limit = Math.min(Number(searchParams.get("limit") ?? 200), 500);

  const supabase = createAdminClient();
  let query = supabase
    .from("texts")
    .select("id, source, split, human_label, gold_rule_id, context, raw_text")
    .in("source", ["dna", "jigsaw"])
    .order("id", { ascending: true })
    .limit(limit);

  if (source) query = query.eq("source", source);
  if (split) query = query.eq("split", split);
  if (goldRuleId) query = query.eq("gold_rule_id", goldRuleId);
  if (q) query = query.or(`id.ilike.%${q}%,raw_text.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Trim to a short preview; full text is fetched lazily in the detail view.
  const trimmed = data.map((t) => ({
    ...t,
    raw_text: t.raw_text.length > 120 ? t.raw_text.slice(0, 120) + "…" : t.raw_text,
  }));
  return Response.json(trimmed);
}
