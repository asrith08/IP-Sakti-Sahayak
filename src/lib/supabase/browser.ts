import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Surface a clear error in the console so the developer can act on it.
  // Do NOT throw here — throwing at module scope crashes the entire React tree
  // and produces a blank screen with no diagnostics.
  console.error(
    '[IP-SAKTI] Missing Supabase environment variables.\n' +
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in your Vercel ' +
    'project environment variables (Settings → Environment Variables).\n' +
    'The application will not be able to authenticate until these are configured.'
  );
}

// Fall back to empty strings so createClient does not throw at import time.
// Auth operations will fail gracefully (network errors) rather than crashing the UI.
export const supabaseBrowser: SupabaseClient = createClient(
  supabaseUrl ?? '',
  supabaseAnonKey ?? '',
);
