/** Shared URL/key resolution for browser, server, and middleware clients. */

// During `next build`, env vars may be missing. Supabase requires non-empty URL/key at init.
const DEMO_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const FALLBACK_URL = "https://abcdefghijklmnopqrst.supabase.co";

const INVALID_URL_PLACEHOLDERS = new Set([
  "",
  "undefined",
  "null",
  "your-supabase-url",
  "your_project_url",
  "https://",
  "http://",
]);

function resolveSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  if (!raw || INVALID_URL_PLACEHOLDERS.has(raw.toLowerCase())) return FALLBACK_URL;

  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`;
  const normalized = withProto.replace(/\/+$/, "");

  try {
    const u = new URL(normalized);
    if (u.protocol !== "https:" && u.protocol !== "http:") return FALLBACK_URL;
    if (!u.hostname) return FALLBACK_URL;
    const h = u.hostname.toLowerCase();
    if (h !== "localhost" && h !== "::1" && !h.includes(".")) return FALLBACK_URL;
    return normalized;
  } catch {
    return FALLBACK_URL;
  }
}

function resolveSupabaseAnonKey(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return raw || DEMO_ANON;
}

export function getSupabaseUrl(): string {
  return resolveSupabaseUrl();
}

export function getSupabaseAnonKey(): string {
  return resolveSupabaseAnonKey();
}
