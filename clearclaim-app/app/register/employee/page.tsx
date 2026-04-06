'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function RegisterEmployeeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenError, setTokenError] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setTokenError('No invite token found. Please use the link from your invite email.');
      setValidating(false);
      return;
    }
    fetch(`/api/auth/register-employee?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setTokenError(data.error);
        } else {
          setName(data.name || '');
          setEmail(data.email || '');
        }
        setValidating(false);
      })
      .catch(() => {
        setTokenError('Could not validate invite token.');
        setValidating(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }
      router.push('/login?registered=employee');
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-800 flex items-center justify-center">
        <p className="text-white">Validating invite...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-2xl mb-4 shadow-lg shadow-emerald-500/25">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">ClearClaim</h1>
          <p className="text-emerald-300 mt-1 text-sm">Employee Account Setup</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-2xl">
          {tokenError ? (
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="text-lg font-semibold text-white mb-2">Invalid Invite</h2>
              <p className="text-red-300 text-sm mb-6">{tokenError}</p>
              <a href="/login" className="text-emerald-400 hover:text-emerald-300 text-sm">← Back to login</a>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white mb-2">Set up your account</h2>
              <p className="text-gray-400 text-sm mb-6">Choose a password to complete your registration</p>

              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-lg text-red-300 text-sm">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-emerald-200 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    readOnly
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white opacity-60 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-emerald-200 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white opacity-60 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-emerald-200 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-emerald-200 mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Repeat your password"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition shadow-lg shadow-emerald-500/30"
                >
                  {loading ? 'Creating account...' : 'Create account'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RegisterEmployeePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-800 flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    }>
      <RegisterEmployeeForm />
    </Suspense>
  );
}
