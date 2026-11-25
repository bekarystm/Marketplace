'use client';
import { createSupabase } from '@marketplace/shared';

export const supabase = createSupabase({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
});
