import { supabaseBrowser } from './browser';

export interface UserProfile {
  id: string;
  created_at: string;
  updated_at: string;
  display_name: string | null;
  preferred_language: string | null;
}

export interface ProfileUpdate {
  display_name?: string | null;
  preferred_language?: string | null;
}

/**
 * Fetch the authenticated user's profile row.
 * Returns null if the row does not exist yet (e.g. trigger hasn't run).
 * Throws on unexpected Supabase errors.
 */
export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabaseBrowser
    .from('profiles')
    .select('id, created_at, updated_at, display_name, preferred_language')
    .eq('id', userId)
    .maybeSingle();           // returns null instead of error when row is missing

  if (error) {
    throw new Error(error.message);
  }
  return data as UserProfile | null;
}

/**
 * Upsert the authenticated user's profile.
 * The RLS policy ensures only the owner can write their own row
 * (id must equal auth.uid()).  We never pass a foreign userId here;
 * the caller must always pass their own authenticated id.
 */
export async function upsertProfile(
  userId: string,
  updates: ProfileUpdate,
): Promise<UserProfile> {
  const { data, error } = await supabaseBrowser
    .from('profiles')
    .upsert(
      {
        id: userId,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select('id, created_at, updated_at, display_name, preferred_language')
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as UserProfile;
}

/**
 * Change the authenticated user's password.
 * Supabase updateUser requires an active session — it does NOT accept
 * an arbitrary user id, so only the currently signed-in user is updated.
 */
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabaseBrowser.auth.updateUser({ password: newPassword });
  if (error) {
    throw new Error(error.message);
  }
}
