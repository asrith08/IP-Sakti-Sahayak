import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const supabaseBrowser: SupabaseClient = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);
