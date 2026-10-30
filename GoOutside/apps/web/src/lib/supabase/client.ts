import { createWebClient } from "@gooutside/supabase";

let client: ReturnType<typeof createWebClient> | null = null;

export function getSupabaseClient() {
  if (!client) {
    client = createWebClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
  }

  return client;
}