import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * PostgREST on this project caps rows per request at 1000 regardless of
 * `.limit()` (confirmed empirically — see pipeline/precompute_p1.py's
 * fetch_all for the same gotcha on the Python side). Any table that can
 * exceed that needs explicit .range() pagination with a deterministic
 * order, or pages silently repeat/drop rows.
 */
const PAGE_SIZE = 1000;

export async function fetchAllRows<T>(
  supabase: SupabaseClient,
  table: string,
  select: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  build?: (query: any) => any,
  orderBy = "id",
): Promise<{ data: T[]; error: string | null }> {
  const rows: T[] = [];
  let start = 0;

  while (true) {
    let query = supabase.from(table).select(select).order(orderBy, { ascending: true });
    if (build) query = build(query);
    const { data, error } = await query.range(start, start + PAGE_SIZE - 1);

    if (error) return { data: rows, error: error.message };
    if (!data || data.length === 0) break;

    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
    start += PAGE_SIZE;
  }

  return { data: rows, error: null };
}
