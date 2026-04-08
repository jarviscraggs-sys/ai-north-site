'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const BUSINESS_TYPES = [
  { value: 'hair_beauty', label: 'Hair & Beauty' },
  { value: 'restaurant_takeaway', label: 'Restaurant & Takeaway' },
  { value: 'tradesman_contractor', label: 'Tradesman & Contractor' },
  { value: 'estate_agent', label: 'Estate Agent' },
  { value: 'gym_pt', label: 'Gym & PT' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'other', label: 'Other' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface OpeningHour {
  open: boolean;
  from: string;
  to: string;
}

interface FormData {
  // Step 1
  businessName: string;
  businessType: string;
  yourName: string;
  email: string;
  password: string;
  confirmPassword: string;
  // Step 2
  phone: string;
  address: string;
  website: string;
  // Step 3
  services: string;
  openingHours: Record<string, OpeningHour>;
  demoCode: string;
}

function defaultHours(): Record<string, OpeningHour> {
  const hours: Record<string, OpeningHour> = {};
  for (const day of DAYS) {
    hours[day] = { open: day !== 'Sunday', from: '09:00', to: '17:00' };
  }
  return hours;
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<FormData>({
    businessName: '',
    businessType: '',
    yourName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    website: '',
    services: '',
    openingHours: defaultHours(),
    demoCode: '',
  });

  function update(field: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateHours(day: string, field: keyof OpeningHour, value: string | boolean) {
    setForm((f) => ({
      ...f,
      openingHours: {
        ...f.openingHours,
        [day]: { ...f.openingHours[day], [field]: value },
      },
    }));
  }

  function validateStep1() {
    if (!form.businessName || !form.businessType || !form.yourName || !form.email || !form.password) {
      setError('Please fill in all required fields.');
      return false;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return false;
    }
    setError('');
    return true;
  }

  function validateStep2() {
    if (!form.phone || !form.address) {
      setError('Please fill in all required fields.');
      return false;
    }
    setError('');
    return true;
  }

  function next() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => s + 1);
  }

  function back() {
    setError('');
    setStep((s) => s - 1);
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/dashboard');
      } else {
        setError(data.error || 'Signup failed. Please try again.');
        setLoading(false);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  const typLabel = BUSINESS_TYPES.find((t) => t.value === form.businessType)?.label || form.businessType;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center text-xl">
              💬
            </div>
            <span className="text-2xl font-bold text-white">Clayo</span>
          </Link>
          <p className="text-slate-400 mt-2 text-sm">Set up your AI customer assistant in minutes</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
                  s < step
                    ? 'bg-sky-500 text-white'
                    : s === step
                    ? 'bg-sky-500 text-white ring-4 ring-sky-500/30'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {s < step ? '✓' : s}
              </div>
              {s < 4 && <div className={`w-10 h-0.5 ${s < step ? 'bg-sky-500' : 'bg-slate-700'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-2xl">

          {/* Step 1: Business Details */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Business Details</h2>
              <p className="text-slate-400 text-sm mb-6">Tell us about your business</p>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Business name *</label>
                  <input
                    type="text"
                    value={form.businessName}
                    onChange={(e) => update('businessName', e.target.value)}
                    placeholder="e.g. Bella's Hair Studio"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Business type *</label>
                  <select
                    value={form.businessType}
                    onChange={(e) => update('businessType', e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  >
                    <option value="">Select type...</option>
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Your name *</label>
                  <input
                    type="text"
                    value={form.yourName}
                    onChange={(e) => update('yourName', e.target.value)}
                    placeholder="e.g. Sarah"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email address *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="you@yourbusiness.com"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Password *</label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => update('password', e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Confirm password *</label>
                    <input
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) => update('confirmPassword', e.target.value)}
                      placeholder="Repeat password"
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Contact & Location */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Contact & Location</h2>
              <p className="text-slate-400 text-sm mb-6">Where can customers find you?</p>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Business phone number *
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    placeholder="e.g. 07700 900123"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  />
                  <p className="text-xs text-slate-500 mt-1">This number will be used for your WhatsApp bot</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Business address *</label>
                  <textarea
                    value={form.address}
                    onChange={(e) => update('address', e.target.value)}
                    placeholder="e.g. 14 High Street, Sunderland SR1 3AA"
                    rows={3}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Website <span className="text-slate-500">(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={form.website}
                    onChange={(e) => update('website', e.target.value)}
                    placeholder="https://www.yourbusiness.com"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Services */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Your Services</h2>
              <p className="text-slate-400 text-sm mb-6">What do you offer and when are you open?</p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Services & prices
                  </label>
                  <textarea
                    value={form.services}
                    onChange={(e) => update('services', e.target.value)}
                    placeholder="e.g. Cut & Blow Dry £35, Colour from £65, Highlights from £85"
                    rows={4}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Opening hours</label>
                  <div className="space-y-2">
                    {DAYS.map((day) => {
                      const h = form.openingHours[day];
                      return (
                        <div key={day} className="flex items-center gap-3">
                          <div className="w-24 text-sm text-slate-400">{day.slice(0, 3)}</div>
                          <button
                            type="button"
                            onClick={() => updateHours(day, 'open', !h.open)}
                            className={`w-12 h-6 rounded-full transition relative flex-shrink-0 ${
                              h.open ? 'bg-sky-500' : 'bg-slate-600'
                            }`}
                          >
                            <span
                              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                h.open ? 'translate-x-7' : 'translate-x-1'
                              }`}
                            />
                          </button>
                          {h.open ? (
                            <>
                              <input
                                type="time"
                                value={h.from}
                                onChange={(e) => updateHours(day, 'from', e.target.value)}
                                className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                              />
                              <span className="text-slate-500 text-sm">to</span>
                              <input
                                type="time"
                                value={h.to}
                                onChange={(e) => updateHours(day, 'to', e.target.value)}
                                className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                              />
                            </>
                          ) : (
                            <span className="text-slate-500 text-sm">Closed</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Demo code <span className="text-slate-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.demoCode}
                    onChange={(e) => update('demoCode', e.target.value)}
                    placeholder="Have a demo code? Enter it here"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Ready to launch!</h2>
              <p className="text-slate-400 text-sm mb-6">Review your details and launch your AI bot</p>

              <div className="bg-slate-700/50 rounded-xl p-6 space-y-4 mb-6 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-slate-500">Business name</p>
                    <p className="text-white font-medium">{form.businessName}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Type</p>
                    <p className="text-white font-medium">{typLabel}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Contact name</p>
                    <p className="text-white font-medium">{form.yourName}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Email</p>
                    <p className="text-white font-medium">{form.email}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Phone</p>
                    <p className="text-white font-medium">{form.phone}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Address</p>
                    <p className="text-white font-medium">{form.address}</p>
                  </div>
                  {form.website && (
                    <div className="col-span-2">
                      <p className="text-slate-500">Website</p>
                      <p className="text-white font-medium">{form.website}</p>
                    </div>
                  )}
                </div>
                {form.services && (
                  <div>
                    <p className="text-slate-500">Services</p>
                    <p className="text-white font-medium whitespace-pre-wrap">{form.services}</p>
                  </div>
                )}
                <div>
                  <p className="text-slate-500 mb-2">Opening hours</p>
                  <div className="grid grid-cols-2 gap-1">
                    {DAYS.map((day) => {
                      const h = form.openingHours[day];
                      return (
                        <div key={day} className="flex gap-2 text-xs">
                          <span className="text-slate-400 w-8">{day.slice(0, 3)}</span>
                          <span className="text-white">
                            {h.open ? `${h.from} – ${h.to}` : 'Closed'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {form.demoCode && (
                  <div>
                    <p className="text-slate-500">Demo code</p>
                    <p className="text-sky-400 font-medium">{form.demoCode}</p>
                  </div>
                )}
              </div>

              <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-4 mb-6">
                <p className="text-sky-300 text-sm">
                  🤖 We&apos;ll automatically generate your AI assistant&apos;s system prompt from the details above. Your bot will be ready to answer questions and take bookings immediately.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 mt-8">
            {step > 1 && (
              <button
                onClick={back}
                className="px-6 py-3 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition font-medium"
              >
                Back
              </button>
            )}

            {step < 4 ? (
              <button
                onClick={next}
                className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-semibold py-3 px-6 rounded-lg transition"
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition"
              >
                {loading ? 'Launching your bot...' : 'Launch My Bot →'}
              </button>
            )}
          </div>

          {step === 1 && (
            <p className="text-center text-sm text-slate-500 mt-4">
              Already have an account?{' '}
              <Link href="/login" className="text-sky-400 hover:text-sky-300 transition">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
