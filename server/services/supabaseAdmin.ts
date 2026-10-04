import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL in .env');
}

export const getSupabaseAdmin = (): SupabaseClient => {
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in .env for admin operations');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};