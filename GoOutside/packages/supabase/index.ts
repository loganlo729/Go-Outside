import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

export const createWebClient = (url: string, publishableKey: string) => {
  return createBrowserClient(url, publishableKey);
};

export const createMobileClient = (
  url: string,
  publishableKey: string,
  asyncStorage: any
) => {
  return createClient(url, publishableKey, {
    auth: {
      storage: asyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
};