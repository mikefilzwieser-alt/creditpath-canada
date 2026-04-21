import { createBrowserClient } from "@supabase/ssr";

/** Browser / client-component client; session is stored in cookies for SSR alignment. */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
