import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: text, error: textError }, { data: sim, error: simError }] = await Promise.all([
    supabase
      .from("texts")
      .select("id, source, split, raw_text, context, human_label, response_llm, gold_rule_id")
      .eq("id", id)
      .single(),
    supabase.from("similarity_steps").select("rule_id, level, score").eq("text_id", id),
  ]);

  if (textError) {
    return Response.json({ error: textError.message }, { status: 404 });
  }
  if (simError) {
    return Response.json({ error: simError.message }, { status: 500 });
  }

  return Response.json({ text, similarity: sim });
}
