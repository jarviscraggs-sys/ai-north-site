'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface InviteData {
  name: string;
  company: string;
  email: string;
  cis_rate: number;
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      // No invite token — this is not a subcontractor invite link.
      // Redirect to contractor registration immediately.
      router.replace('/register/contractor');
      return;
    }

    // Validate invite token
    fetch(`/api/auth/register?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
          setLoading(false);
        } else {
          setInvite(data);
          setLoading(false);
        }
      })
      .catch(() => {
        setError('Failed to load invite. Please try again.');
        setLoading(false);
      });
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: form.password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        setSubmitting(false);
        return;
      }

      router.push('/login?registered=subcontractor');
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="text-white">Loading invite...</div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Invite</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <Link href="/login" className="text-blue-400 hover:text-blue-300">← Back to login</Link>
        </div>
      </div>
    );
  }

  if (!invite) return null;

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">You've been invited!</h1>
          <p className="text-slate-400 mt-2">Set your password to join <span className="text-white font-medium">{invite.company}</span> on ClearClaim</p>
        </div>

        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8">
          <div className="mb-6 p-4 bg-slate-700/50 rounded-xl">
            <p className="text-slate-300 text-sm"><span className="text-slate-400">Name:</span> {invite.name}</p>
            <p className="text-slate-300 text-sm mt-1"><span className="text-slate-400">Email:</span> {invite.email}</p>
            <p className="text-slate-300 text-sm mt-1"><span className="text-slate-400">Contractor:</span> {invite.company}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Min. 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Repeat password"
                required
                autoComplete="new-password"
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="showpw" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} className="w-4 h-4" />
              <label htmlFor="showpw" className="text-sm text-slate-400 cursor-pointer">Show passwords</label>
            </div>

            {error && (
              <div className="p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
            >
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Already have an account? <Link href="/login" className="text-blue-400 hover:text-blue-300">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
      <RegisterContent />
    </Suspense>
  );
}
