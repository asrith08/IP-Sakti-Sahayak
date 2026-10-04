import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabaseBrowser } from '../supabase/browser';
import { Session, User } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string) => Promise<{ needsEmailVerification: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

    // 2. Subscribe to auth state changes
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
  ): Promise<{ needsEmailVerification: boolean }> => {
    setError(null);
    const { data, error: err } = await supabaseBrowser.auth.signUp({ email, password });
    if (err) {
      setError(err.message ?? 'Sign up failed');
      return { needsEmailVerification: false };
    }
    // Supabase returns a session immediately only when email confirmation is disabled.
    // When confirmation is required, data.session is null and data.user.confirmed_at is null.
    const needsEmailVerification = !data.session;
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
    }
    return { needsEmailVerification };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    setError(null);
    const { data, error: err } = await supabaseBrowser.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message ?? 'Sign in failed');
      return;
    }
    setSession(data.session ?? null);
    setUser(data.user ?? null);
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    setError(null);
    const { error: err } = await supabaseBrowser.auth.signOut();
    if (err) {
      setError(err.message ?? 'Sign out failed');
      return;
    }
    setSession(null);
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<void> => {
    setError(null);
    const redirectTo = `${window.location.origin}/login`;
    const { error: err } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (err) {
      setError(err.message ?? 'Password reset failed');
    }
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
