import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// service_role key: bypasses RLS. Only import this from Route Handlers / Server Actions
// that need write access (rule revisions, cached re-judge results, data loads).
// Never import this file from a Client Component.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
