import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabaseBrowser } from '../supabase/browser';
import { Session, User } from '@supabase/supabase-js';

// ── Friendly error messages ───────────────────────────────────────────────────
// Maps raw Supabase error substrings to user-facing copy.
// Never exposes internal codes, stack traces, or database details.
function humanizeAuthError(raw: string): string {
  const msg = raw.toLowerCase();

  // Sign-in errors
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'Incorrect email or password. Please check and try again.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Your email address has not been confirmed yet. Please check your inbox for the verification email and click the link before signing in.';
  }
  if (msg.includes('too many requests') || msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
    return 'Too many attempts. Please wait a few minutes before trying again.';
  }

  // Sign-up errors
  if (msg.includes('user already registered') || msg.includes('already been registered') || msg.includes('email address is already')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (msg.includes('password should be') || msg.includes('password is too short') || msg.includes('weak password')) {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (msg.includes('unable to validate email') || msg.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }
  if (msg.includes('signup is disabled') || msg.includes('signups not allowed')) {
    return 'New account registration is currently disabled. Please contact support.';
  }

  // Password reset errors
  if (msg.includes('token has expired') || msg.includes('otp expired')) {
    return 'This link has expired. Please request a new password reset email.';
  }
  if (msg.includes('token not found') || msg.includes('invalid token')) {
    return 'This link is invalid or has already been used. Please request a new one.';
  }

  // Network / infrastructure
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('fetch')) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }
  if (msg.includes('service unavailable') || msg.includes('503') || msg.includes('502')) {
    return 'The authentication service is temporarily unavailable. Please try again in a moment.';
  }

  // Fallback: return the raw message but strip any JSON/stack noise
  // Keep it under 120 chars so it doesn't overflow the UI.
  return raw.length > 120 ? raw.slice(0, 117) + '…' : raw;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SignUpResult {
  needsEmailVerification: boolean;
  error: string | null;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // loading = true only while we are awaiting the initial session restore
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Restore existing session on mount
    supabaseBrowser.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // 2. Subscribe to auth state changes and clean up on unmount
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession ?? null);
        setUser(newSession?.user ?? null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const signUp = useCallback(async (
    email: string,
    password: string,
  ): Promise<SignUpResult> => {
    setError(null);

    // emailRedirectTo: dynamically uses the current origin so the confirmation
    // link works correctly on both localhost:3001 and the production Vercel URL.
    // This is the root-cause fix for confirmation emails redirecting to the
    // wrong host when Site URL in the Supabase dashboard is out of date.
    const emailRedirectTo = `${window.location.origin}/login`;

    const { data, error: err } = await supabaseBrowser.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });

    if (err) {
      const friendly = humanizeAuthError(err.message ?? 'Sign up failed');
      setError(friendly);
      return { needsEmailVerification: false, error: friendly };
    }

    // Supabase returns a session immediately only when email confirmation is
    // disabled in the dashboard. When confirmation is required, data.session
    // is null and the user must click the link in their inbox first.
    const needsEmailVerification = !data.session;
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
    }

    // Return the result directly so the caller does not have to read stale
    // React state — the error state update is async and may not be visible
    // on the same render cycle.
    return { needsEmailVerification, error: null };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    setError(null);
    const { data, error: err } = await supabaseBrowser.auth.signInWithPassword({ email, password });
    if (err) {
      setError(humanizeAuthError(err.message ?? 'Sign in failed'));
      return;
    }
    setSession(data.session ?? null);
    setUser(data.user ?? null);
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    setError(null);
    const { error: err } = await supabaseBrowser.auth.signOut();
    if (err) {
      setError(humanizeAuthError(err.message ?? 'Sign out failed'));
      return;
    }
    setSession(null);
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<{ error: string | null }> => {
    setError(null);
    // Redirect to /login so the user lands on the sign-in form after
    // clicking the password-reset link.
    const redirectTo = `${window.location.origin}/login`;
    const { error: err } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (err) {
      const friendly = humanizeAuthError(err.message ?? 'Password reset failed');
      setError(friendly);
      return { error: friendly };
    }
    return { error: null };
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, loading, error, signUp, signIn, signOut, resetPassword, clearError }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
