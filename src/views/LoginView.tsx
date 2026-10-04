import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';

type Mode = 'signin' | 'signup' | 'reset' | 'verify-sent' | 'reset-sent';

export const LoginView: React.FC = () => {
  const { user, signIn, signUp, signInWithGoogle, resetPassword, loading: authLoading, error: authError, clearError } = useAuth();
  const { navigate } = useRouter();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirect already-authenticated users away from /login
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/');
    }
  }, [authLoading, user, navigate]);

  // Clear both error sources when mode changes
  useEffect(() => {
    setLocalError(null);
    clearError();
  }, [mode, clearError]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setPassword('');
    setConfirmPassword('');
    setLocalError(null);
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Re-entrancy guard: if a submission is already in flight, ignore this event.
    // This is the primary protection against double-submission from any source
    // (double-click, form re-render, StrictMode, browser autofill submit, etc.).
    if (submitting) return;

    setLocalError(null);
    clearError();

    if (mode === 'signin') {
      if (!email || !password) {
        setLocalError('Please enter your email and password.');
        return;
      }
      setSubmitting(true);
      try {
        await signIn(email, password);
      } finally {
        // Always reset — even if signIn throws an unhandled exception.
        setSubmitting(false);
      }
      // Navigation handled by the useEffect above when user is set

    } else if (mode === 'signup') {
      if (!email || !password || !confirmPassword) {
        setLocalError('Please fill in all fields.');
        return;
      }
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }
      setSubmitting(true);
      try {
        const result = await signUp(email, password);
        // Use result.error directly — authError state is async and may not have
        // updated yet on this render cycle, which caused stale-state false positives.
        if (!result.error) {
          if (result.needsEmailVerification) {
            setMode('verify-sent');
          }
          // If needsEmailVerification is false, user is auto-confirmed and the
          // onAuthStateChange listener will set user, triggering the redirect effect.
        }
      } finally {
        setSubmitting(false);
      }

    } else if (mode === 'reset') {
      if (!email) {
        setLocalError('Please enter your email address.');
        return;
      }
      setSubmitting(true);
      try {
        const resetResult = await resetPassword(email);
        // Use result.error directly — same pattern as signUp to avoid stale state.
        if (!resetResult.error) {
          setMode('reset-sent');
        }
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#08130f]">
        <div className="text-[#f5f1e7] text-base">Loading...</div>
      </div>
    );
  }

  const displayError = localError || authError;

  // ── Verification sent state ─────────────────────────────────────────────────
  if (mode === 'verify-sent') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#08130f] px-4">
        <div className="w-full max-w-md bg-[#0a1b14]/90 backdrop-blur-md rounded-2xl border border-[#c8a45d]/20 p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-[#c8a45d]/15 border border-[#c8a45d]/30 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-[#dfbe7b]" />
          </div>
          <h2 className="text-xl font-bold text-[#f5f1e7] mb-3">Verify your email</h2>
          <p className="text-sm text-[#d6ccb6] mb-2">
            A verification email has been sent to:
          </p>
          <p className="text-sm font-semibold text-[#dfbe7b] mb-5 break-all">{email}</p>
          <p className="text-xs text-[#d6ccb6]/80 mb-6">
            Click the link in the email to confirm your account. The link will redirect you back here to sign in.
            Check your spam folder if you don't see it within a few minutes.
          </p>
          <button
            onClick={() => switchMode('signin')}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#c8a45d] to-[#dfbe7b] text-[#08130f] font-semibold hover:brightness-105 transition-all duration-200"
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  // ── Password reset sent state ───────────────────────────────────────────────
  if (mode === 'reset-sent') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#08130f] px-4">
        <div className="w-full max-w-md bg-[#0a1b14]/90 backdrop-blur-md rounded-2xl border border-[#c8a45d]/20 p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-[#c8a45d]/15 border border-[#c8a45d]/30 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-[#dfbe7b]" />
          </div>
          <h2 className="text-xl font-bold text-[#f5f1e7] mb-3">Check your inbox</h2>
          <p className="text-sm text-[#d6ccb6] mb-2">
            A password reset link has been sent to:
          </p>
          <p className="text-sm font-semibold text-[#dfbe7b] mb-5 break-all">{email}</p>
          <p className="text-xs text-[#d6ccb6]/80 mb-6">
            Follow the link in the email to set a new password.
            Check your spam folder if you don't see it within a few minutes.
          </p>
          <button
            onClick={() => switchMode('signin')}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#c8a45d] to-[#dfbe7b] text-[#08130f] font-semibold hover:brightness-105 transition-all duration-200"
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────────
  const title =
    mode === 'signin' ? 'Sign In' :
    mode === 'signup' ? 'Create Account' :
    'Reset Password';

  const submitLabel =
    mode === 'signin' ? (submitting ? 'Signing in…' : 'Sign In') :
    mode === 'signup' ? (submitting ? 'Creating account…' : 'Create Account') :
    (submitting ? 'Sending…' : 'Send Reset Email');

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#08130f] px-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="flex items-center justify-center space-x-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1c3e32] to-[#0c1e18] border border-[#c8a45d]/40 flex items-center justify-center shadow-md">
            <ShieldCheck className="w-5 h-5 text-[#dfbe7b]" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-wider text-lg text-[#f5f1e7]">IP-SAKTI</span>
            <span className="text-[10px] tracking-widest uppercase font-medium text-[#c8a45d]/90 -mt-1">
              Sahayak
            </span>
          </div>
        </div>

        <div className="bg-[#0a1b14]/90 backdrop-blur-md rounded-2xl border border-[#c8a45d]/20 p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-[#f5f1e7] mb-6 text-center">{title}</h2>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-mono uppercase tracking-wider text-[#dfbe7b]">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#06120d]/85 border border-[#1c3e32] rounded-xl px-4 py-3 text-sm text-[#f5f1e7] placeholder-[#d6ccb6]/50 focus:outline-none focus:border-[#dfbe7b] transition-colors"
              />
            </div>

            {/* Password */}
            {(mode === 'signin' || mode === 'signup') && (
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-mono uppercase tracking-wider text-[#dfbe7b]">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                  className="w-full bg-[#06120d]/85 border border-[#1c3e32] rounded-xl px-4 py-3 text-sm text-[#f5f1e7] placeholder-[#d6ccb6]/50 focus:outline-none focus:border-[#dfbe7b] transition-colors"
                />
              </div>
            )}

            {/* Confirm Password */}
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="block text-xs font-mono uppercase tracking-wider text-[#dfbe7b]">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full bg-[#06120d]/85 border border-[#1c3e32] rounded-xl px-4 py-3 text-sm text-[#f5f1e7] placeholder-[#d6ccb6]/50 focus:outline-none focus:border-[#dfbe7b] transition-colors"
                />
              </div>
            )}

            {/* Forgot password link */}
            {mode === 'signin' && (
              <div className="text-right -mt-1">
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  className="text-xs text-[#c8a45d] hover:text-[#dfbe7b] hover:underline transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Error message */}
            {displayError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-xs text-red-200 leading-relaxed"
              >
                {displayError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#c8a45d] to-[#dfbe7b] text-[#08130f] font-semibold hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
            >
              {submitLabel}
            </button>
          </form>

          {/* Google OAuth — shown for signin and signup only, not for password reset */}
          {(mode === 'signin' || mode === 'signup') && (
            <>
              {/* Divider */}
              <div className="flex items-center my-5">
                <div className="flex-1 h-px bg-[#1c3e32]" />
                <span className="mx-3 text-[11px] uppercase tracking-widest text-[#d6ccb6]/50 font-mono">or</span>
                <div className="flex-1 h-px bg-[#1c3e32]" />
              </div>

              {/* Continue with Google */}
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  if (submitting) return;
                  signInWithGoogle();
                }}
                className="w-full flex items-center justify-center space-x-3 py-3 rounded-xl bg-[#06120d]/85 border border-[#1c3e32] text-sm font-medium text-[#f5f1e7] hover:border-[#c8a45d]/50 hover:bg-[#0a1b14] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {/* Google 'G' logo — inline SVG, no external dependency */}
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
                  <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </>
          )}

          {/* Mode switcher */}
          <div className="mt-5 text-center text-xs text-[#d6ccb6]/70 space-y-2">            {mode === 'signin' && (
              <p>
                New to the system?{' '}
                <button
                  type="button"
                  className="text-[#c8a45d] hover:text-[#dfbe7b] hover:underline transition-colors"
                  onClick={() => switchMode('signup')}
                >
                  Create account
                </button>
              </p>
            )}
            {mode === 'signup' && (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  className="text-[#c8a45d] hover:text-[#dfbe7b] hover:underline transition-colors"
                  onClick={() => switchMode('signin')}
                >
                  Sign In
                </button>
              </p>
            )}
            {mode === 'reset' && (
              <p>
                Remembered your password?{' '}
                <button
                  type="button"
                  className="text-[#c8a45d] hover:text-[#dfbe7b] hover:underline transition-colors"
                  onClick={() => switchMode('signin')}
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
