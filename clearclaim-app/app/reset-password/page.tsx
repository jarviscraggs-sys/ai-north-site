'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [tokenError, setTokenError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!token) {
      setTokenError('No reset token provided.');
      setTokenLoading(false);
      return;
    }

    fetch(`/api/auth/reset-password?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) setTokenError(data.error);
        setTokenLoading(false);
      })
      .catch(() => {
        setTokenError('Failed to validate reset link.');
        setTokenLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...form }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Reset failed.');
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-sm";
  const labelCls = "block text-sm font-medium text-blue-200 mb-1.5";

  if (tokenLoading) {
    return <div className="text-blue-300 text-center py-6">Validating reset link...</div>;
  }

  if (tokenError) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">❌</div>
        <h2 className="text-xl font-bold text-white mb-2">Invalid Reset Link</h2>
        <p className="text-red-300 mb-4">{tokenError}</p>
        <Link href="/forgot-password" className="text-blue-300 hover:text-white text-sm">
          Request a new reset link →
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-white mb-2">Password Updated!</h2>
        <p className="text-blue-300 text-sm">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-white mb-2">Set new password</h2>
      <p className="text-blue-300 text-sm mb-6">Choose a strong password for your account.</p>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>New Password</label>
          <input
            type="password"
            required
            placeholder="Min. 8 characters"
            className={inputCls}
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <div>
          <label className={labelCls}>Confirm Password</label>
          <input
            type="password"
            required
            placeholder="Re-enter your password"
            className={inputCls}
            value={form.confirmPassword}
            onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-semibold rounded-xl transition shadow-lg shadow-blue-500/30"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl mb-4 shadow-lg shadow-blue-500/25">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">ClearClaim</h1>
          <p className="text-blue-300 mt-1 text-sm">Construction Invoice Management</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-2xl">
          <Suspense fallback={<div className="text-blue-300 text-center">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
