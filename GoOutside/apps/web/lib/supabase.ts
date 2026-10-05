import { createWebClient } from "@gooutside/supabase";

export function getSupabaseClient() {
  return createWebClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}