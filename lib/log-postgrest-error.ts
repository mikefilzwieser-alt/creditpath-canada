import type { PostgrestError } from "@supabase/supabase-js";

/** Logs PostgREST / Supabase table errors for debugging (browser or server). */
export function logPostgrestError(
  label: string,
  error: PostgrestError | null,
  context?: Record<string, unknown>,
): void {
  if (!error) return;
  const summary = {
    ...context,
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  };
  console.error(label, summary);
  console.log(`${label} (full error JSON)`, JSON.stringify({ ...summary, error }, null, 2));
}
