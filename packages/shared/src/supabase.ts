import { createClient, type SupabaseClient, type SupportedStorage } from '@supabase/supabase-js';
import type { Database } from './database.types.ts';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config.ts';

export type DB = SupabaseClient<Database>;

export function createSupabase(options: {
  storage?: SupportedStorage;
  url?: string;
  key?: string;
  detectSessionInUrl?: boolean;
} = {}): DB {
  return createClient<Database>(options.url ?? SUPABASE_URL, options.key ?? SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: options.storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: options.detectSessionInUrl ?? false,
    },
  });
}
