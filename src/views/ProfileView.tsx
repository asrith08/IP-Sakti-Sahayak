import React, { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, User, Globe, Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import {
  getProfile,
  upsertProfile,
  updatePassword,
  UserProfile,
} from '../lib/supabase/profile';

// ── Helpers ───────────────────────────────────────────────────────────────────

const LANGUAGE_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
  { value: 'te', label: 'తెలుగు (Telugu)' },
  { value: 'ta', label: 'தமிழ் (Tamil)' },
  { value: 'mr', label: 'मराठी (Marathi)' },
  { value: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

const SectionCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({
  icon, title, children,
}) => (
  <div className="bg-[#0a1b14]/90 border border-[#c8a45d]/20 rounded-2xl p-6">
    <div className="flex items-center space-x-3 mb-5">
      <div className="p-2 rounded-lg bg-[#c8a45d]/10 border border-[#c8a45d]/20">
        {icon}
      </div>
      <h2 className="text-base font-semibold text-[#f5f1e7]">{title}</h2>
    </div>
    {children}
  </div>
);

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-xs font-mono uppercase tracking-wider text-[#dfbe7b] mb-1.5">
    {children}
  </label>
);

const ReadonlyField: React.FC<{ value: string }> = ({ value }) => (
  <div className="w-full bg-[#06120d]/60 border border-[#1c3e32] rounded-xl px-4 py-3 text-sm text-[#d6ccb6]">
    {value}
  </div>
);

const TextInput: React.FC<{
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}> = ({ id, value, onChange, placeholder, disabled }) => (
  <input
    id={id}
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    className="w-full bg-[#06120d]/85 border border-[#1c3e32] rounded-xl px-4 py-3 text-sm text-[#f5f1e7] placeholder-[#d6ccb6]/50 focus:outline-none focus:border-[#dfbe7b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  />
);

const PasswordInput: React.FC<{
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}> = ({ id, value, onChange, placeholder, disabled }) => (
  <input
    id={id}
    type="password"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    autoComplete="new-password"
    className="w-full bg-[#06120d]/85 border border-[#1c3e32] rounded-xl px-4 py-3 text-sm text-[#f5f1e7] placeholder-[#d6ccb6]/50 focus:outline-none focus:border-[#dfbe7b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  />
);

interface FeedbackProps { type: 'success' | 'error'; message: string }
const Feedback: React.FC<FeedbackProps> = ({ type, message }) => (
  <div
    role="alert"
    className={`flex items-start space-x-2 p-3 rounded-lg text-xs leading-relaxed ${
      type === 'success'
        ? 'bg-emerald-900/40 border border-emerald-500/40 text-emerald-200'
        : 'bg-red-950/60 border border-red-500/40 text-red-200'
    }`}
  >
    {type === 'success'
      ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
      : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />}
    <span>{message}</span>
  </div>
);

// ── Main View ─────────────────────────────────────────────────────────────────

export const ProfileView: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { navigate } = useRouter();

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Edit state
  const [displayName, setDisplayName] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordResult, setPasswordResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, user, navigate]);

  // Load profile once user is known
  const loadProfile = useCallback(async () => {
    if (!user) return;
    setProfileLoading(true);
    setProfileError(null);
    try {
      const data = await getProfile(user.id);
      setProfile(data);
      setDisplayName(data?.display_name ?? '');
      setPreferredLanguage(data?.preferred_language ?? '');
    } catch (err) {
      setProfileError('Unable to load profile. Please try again.');
      console.error('Profile load error', err);
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      loadProfile();
    }
  }, [authLoading, user, loadProfile]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveResult(null);
    try {
      const updated = await upsertProfile(user.id, {
        display_name: displayName.trim() || null,
        preferred_language: preferredLanguage || null,
      });
      setProfile(updated);
      setDisplayName(updated.display_name ?? '');
      setPreferredLanguage(updated.preferred_language ?? '');
      setSaveResult({ type: 'success', message: 'Profile saved successfully.' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile.';
      setSaveResult({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordResult(null);
    if (newPassword.length < 6) {
      setPasswordResult({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordResult({ type: 'error', message: 'Passwords do not match.' });
      return;
    }
    setPasswordSaving(true);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordResult({ type: 'success', message: 'Password updated successfully.' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update password.';
      setPasswordResult({ type: 'error', message: msg });
    } finally {
      setPasswordSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-[#c8a45d] animate-spin" />
      </div>
    );
  }

  if (!user) return null; // redirect in progress

  // Derive display label: display_name → email local-part → full email
  const emailLocalPart = user.email?.split('@')[0] ?? '';
  const accountLabel = profile?.display_name || emailLocalPart || user.email || 'Account';

  // Account creation date: prefer profile.created_at, fall back to user metadata
  const createdAt =
    profile?.created_at ??
    (user.created_at ? user.created_at : null);

  return (
    <div className="min-h-screen bg-[#08130f] px-4 py-12">
      <div className="w-full max-w-2xl mx-auto space-y-6">

        {/* Page header */}
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1c3e32] to-[#0c1e18] border border-[#c8a45d]/40 flex items-center justify-center shadow-md">
            <ShieldCheck className="w-6 h-6 text-[#dfbe7b]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#f5f1e7]">{accountLabel}</h1>
            <p className="text-xs text-[#c8a45d]/80 tracking-wide uppercase mt-0.5">
              Account Profile
            </p>
          </div>
        </div>

        {/* Profile load error banner */}
        {profileError && (
          <Feedback type="error" message={profileError} />
        )}

        {/* Missing profile notice */}
        {!profileError && !profile && (
          <Feedback
            type="error"
            message="Your profile record was not found. Save the form below to create it."
          />
        )}

        {/* ── Account Info (read-only) ─────────────────────────────────────── */}
        <SectionCard
          icon={<User className="w-4 h-4 text-[#dfbe7b]" />}
          title="Account Information"
        >
          <div className="space-y-4">
            <div>
              <FieldLabel>Email</FieldLabel>
              <ReadonlyField value={user.email ?? '—'} />
            </div>
            {createdAt && (
              <div>
                <FieldLabel>Member Since</FieldLabel>
                <ReadonlyField value={formatDate(createdAt)} />
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── Edit Profile ─────────────────────────────────────────────────── */}
        <SectionCard
          icon={<Globe className="w-4 h-4 text-[#dfbe7b]" />}
          title="Profile Details"
        >
          <form onSubmit={handleSaveProfile} className="space-y-4" noValidate>
            <div>
              <FieldLabel>Display Name</FieldLabel>
              <TextInput
                id="displayName"
                value={displayName}
                onChange={setDisplayName}
                placeholder="Your name (optional)"
                disabled={saving}
              />
            </div>
            <div>
              <FieldLabel>Preferred Language</FieldLabel>
              <select
                id="preferredLanguage"
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                disabled={saving}
                className="w-full bg-[#06120d]/85 border border-[#1c3e32] rounded-xl px-4 py-3 text-sm text-[#f5f1e7] focus:outline-none focus:border-[#dfbe7b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {saveResult && (
              <Feedback type={saveResult.type} message={saveResult.message} />
            )}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#c8a45d] to-[#dfbe7b] text-[#08130f] text-sm font-semibold hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{saving ? 'Saving…' : 'Save Profile'}</span>
            </button>
          </form>
        </SectionCard>

        {/* ── Change Password ───────────────────────────────────────────────── */}
        <SectionCard
          icon={<Lock className="w-4 h-4 text-[#dfbe7b]" />}
          title="Change Password"
        >
          <form onSubmit={handleChangePassword} className="space-y-4" noValidate>
            <div>
              <FieldLabel>New Password</FieldLabel>
              <PasswordInput
                id="newPassword"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Min. 6 characters"
                disabled={passwordSaving}
              />
            </div>
            <div>
              <FieldLabel>Confirm New Password</FieldLabel>
              <PasswordInput
                id="confirmPassword"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Re-enter password"
                disabled={passwordSaving}
              />
            </div>

            {passwordResult && (
              <Feedback type={passwordResult.type} message={passwordResult.message} />
            )}

            <button
              type="submit"
              disabled={passwordSaving}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#1c3e32] border border-[#c8a45d]/30 text-[#dfbe7b] text-sm font-semibold hover:bg-[#1c3e32]/80 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
            >
              {passwordSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{passwordSaving ? 'Updating…' : 'Update Password'}</span>
            </button>
          </form>
        </SectionCard>

      </div>
    </div>
  );
};
