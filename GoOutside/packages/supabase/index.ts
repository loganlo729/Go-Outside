import { createClient } from '@supabase/supabase-js'

export const createWebClient = (url: string, anonKey: string) => {
  return createClient(url, anonKey)
}

export const createMobileClient = (url: string, anonKey: string, asyncStorage: any) => {
  return createClient(url, anonKey, {
    auth: {
      storage: asyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })
}
