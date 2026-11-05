import { createClient } from "@/lib/supabase/server";

const TABLES = ["texts", "rules", "judgments", "diagnoses", "rule_revisions"] as const;

export async function DbStatus() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return (
      <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        Supabase 환경변수가 설정되지 않았습니다. <code>.env.local</code>에
        <code> NEXT_PUBLIC_SUPABASE_URL</code> / <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>를
        추가하세요 (<code>.env.local.example</code> 참고).
      </div>
    );
  }

  const supabase = await createClient();

  const counts = await Promise.all(
    TABLES.map(async (table) => {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });
      return { table, count, error: error?.message ?? null };
    }),
  );

  const anyError = counts.find((c) => c.error);

  return (
    <div className="rounded border border-neutral-200 p-4 text-sm dark:border-neutral-800">
      <div className="mb-2 font-medium">
        {anyError ? "⚠️ Supabase 연결은 됐지만 스키마 문제가 있습니다" : "✅ Supabase 연결됨"}
      </div>
      <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3">
        {counts.map((c) => (
          <li key={c.table} className="text-neutral-600 dark:text-neutral-400">
            {c.table}:{" "}
            {c.error ? (
              <span className="text-red-600 dark:text-red-400">{c.error}</span>
            ) : (
              <span className="font-mono">{c.count}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
