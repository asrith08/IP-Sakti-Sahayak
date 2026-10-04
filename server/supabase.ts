import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env',
  );
}

/**
 * Server-side Supabase client.
 * Uses the anon key — sufficient for auth.getUser(token) token validation.
 * If RLS-bypassing operations are needed later, use SUPABASE_SERVICE_ROLE_KEY
 * in a separate privileged client and never expose it to the browser.
 */
export const supabaseServer: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

