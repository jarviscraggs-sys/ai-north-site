'use client'

import Link from 'next/link'
import { useState } from 'react'

const freePlan = {
  name: '1 Month Free Trial',
  badge: 'Trial',
  price: { monthly: 0, yearly: 0 },
  desc: 'Full Pro access for 1 month. No card required.',
  cta: 'Start Free Trial',
  ctaHref: '/register/contractor',
  ctaStyle: 'secondary' as const,
  highlight: false,
  features: [
    { label: 'Up to 3 subcontractors', included: true },
    { label: 'Up to 10 invoices/month', included: true },
    { label: 'Basic invoice management', included: true },
    { label: 'CIS calculation', included: true },
    { label: 'Email notifications', included: true },
    { label: '1 project', included: true },
    { label: 'AI duplicate detection', included: false },
    { label: 'Timesheets & holidays', included: false },
    { label: 'Compliance tracker', included: false },
    { label: 'QuickBooks/Xero export', included: false },
    { label: 'Variations', included: false },
    { label: 'Document storage', included: false },
  ],
}

const proPlan = {
  name: 'Pro',
  badge: 'Most Popular',
  price: { monthly: 149, yearly: 1490 },
  desc: 'Everything you need to run your site efficiently.',

  cta: 'Start Pro Trial',
  ctaHref: '/register/contractor',
  ctaStyle: 'primary' as const,
  highlight: true,
  features: [
    { label: 'Unlimited subcontractors', included: true },
    { label: 'Unlimited invoices', included: true },
    { label: 'Everything in Free', included: true },
    { label: 'AI duplicate detection', included: true },
    { label: 'Timesheets & holidays (up to 10 employees)', included: true },
    { label: 'Compliance tracker', included: true },
    { label: 'QuickBooks & Xero export', included: true },
    { label: 'Variations & change orders', included: true },
    { label: 'Document storage (5GB)', included: true },
    { label: 'Cash flow forecast', included: true },
    { label: 'Dispute resolution', included: true },
    { label: 'Up to 10 projects', included: true },
    { label: 'Bulk invoice import', included: true },
    { label: 'Priority email support', included: true },
  ],
}

const enterprisePlan = {
  name: 'Enterprise',
  badge: 'Full Power',
  price: { monthly: 399, yearly: 3990 },
  desc: 'For large contractors who need everything.',
  cta: 'Contact Sales',
  ctaHref: 'mailto:sales@getclearclaim.co.uk',
  ctaStyle: 'secondary' as const,
  highlight: false,
  features: [
    { label: 'Everything in Pro', included: true },
    { label: 'Unlimited employees', included: true },
    { label: 'Unlimited projects', included: true },
    { label: 'Unlimited document storage', included: true },
    { label: 'HMRC CIS verification logging', included: true },
    { label: 'Custom branding (your logo)', included: true },
    { label: 'Dedicated account manager', included: true },
    { label: 'Phone support', included: true },
    { label: 'API access', included: true },
    { label: 'Custom integrations', included: true },
    { label: 'SSO / Active Directory', included: true },
    { label: 'SLA guarantee', included: true },
  ],
}

const faqs = [
  {
    q: 'Can I try Pro before paying?',
    a: 'Yes — all new accounts get a full 1-month free trial with complete Pro access. No credit card required.',
  },
  {
    q: 'What happens to my data if I downgrade?',
    a: 'All your data is retained. You simply lose access to Pro-only features until you upgrade again.',
  },
  {
    q: 'Is ClearClaim CIS compliant?',
    a: 'Yes. ClearClaim automatically calculates CIS deductions at 0%, 20% or 30% and generates HMRC-ready monthly returns.',
  },
  {
    q: 'Do subcontractors need to pay?',
    a: 'No. Subcontractors are always free. They can submit invoices, track payments and manage their CIS returns at no cost.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, cancel anytime with no penalties or hidden fees. Your data remains accessible until the end of your billing period.',
  },
]

type Plan = {
  name: string
  badge: string
  price: { monthly: number; yearly: number }
  desc: string
  cta: string
  ctaHref: string
  ctaStyle: 'primary' | 'secondary'
  highlight: boolean
  features: { label: string; included: boolean }[]
}

function PlanCard({ plan, yearly }: { plan: Plan; yearly: boolean }) {
  const price = yearly ? plan.price.yearly : plan.price.monthly

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-8 transition ${
        plan.highlight
          ? 'border-blue-500/60 bg-blue-500/5 shadow-2xl shadow-blue-500/20 ring-1 ring-blue-500/30'
          : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      {plan.highlight && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-blue-500 px-4 py-1 text-xs font-bold text-white shadow-lg shadow-blue-500/40">
            ⭐ {plan.badge}
          </span>
        </div>
      )}

      <div className="mb-1 flex items-center gap-2">
        <span className="text-xl font-bold text-white">{plan.name}</span>
        {!plan.highlight && (
          <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-slate-400">
            {plan.badge}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-end gap-1">
        {price === 0 ? (
          <span className="text-5xl font-extrabold text-white">Free</span>
        ) : (
          <>
            <span className="text-lg font-semibold text-slate-400">£</span>
            <span className="text-5xl font-extrabold text-white">{price}</span>
            <span className="mb-1 text-slate-400">/{yearly ? 'yr' : 'mo'}</span>
          </>
        )}
      </div>

      {yearly && price > 0 && (
        <p className="mt-1 text-xs text-emerald-400">
          Save {plan.name === 'Pro' ? '2 months' : '2 months'} vs monthly
        </p>
      )}

      <p className="mt-3 text-sm text-slate-400">{plan.desc}</p>

      <ul className="my-8 flex-1 space-y-3">
        {plan.features.map(({ label, included }) => (
          <li key={label} className="flex items-start gap-2 text-sm">
            <span
              className={`mt-0.5 shrink-0 ${
                included ? 'text-emerald-400' : 'text-slate-600'
              }`}
            >
              {included ? '✅' : '❌'}
            </span>
            <span className={included ? 'text-slate-300' : 'text-slate-500'}>
              {label}
            </span>
          </li>
        ))}
      </ul>

      {plan.ctaStyle === 'primary' ? (
        <Link
          href={plan.ctaHref}
          className="block w-full rounded-xl bg-blue-500 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400"
        >
          {plan.cta}
        </Link>
      ) : plan.ctaHref.startsWith('mailto') ? (
        <a
          href={plan.ctaHref}
          className="block w-full rounded-xl border border-white/20 py-3 text-center text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
        >
          {plan.cta}
        </a>
      ) : (
        <Link
          href={plan.ctaHref}
          className="block w-full rounded-xl border border-white/20 py-3 text-center text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
        >
          {plan.cta}
        </Link>
      )}
    </div>
  )
}

export default function PricingPage() {
  const [yearly, setYearly] = useState(false)

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">

      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0f1e]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 shadow-lg shadow-blue-500/30">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">ClearClaim</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/pricing"
              className="hidden rounded-lg px-4 py-2 text-sm font-medium text-white transition sm:block"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/register/contractor"
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400"
            >
              Register Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 pb-16 pt-20 text-center sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center" aria-hidden>
          <div className="mt-16 h-[400px] w-[600px] rounded-full bg-blue-600/15 blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-3xl">
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mb-10 text-lg text-slate-400">
            Start free. Scale as you grow. No hidden fees.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-4 rounded-full border border-white/10 bg-white/[0.05] p-1.5 text-sm">
            <button
              onClick={() => setYearly(false)}
              className={`rounded-full px-5 py-2 font-medium transition ${
                !yearly ? 'bg-blue-500 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`rounded-full px-5 py-2 font-medium transition ${
                yearly ? 'bg-blue-500 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
                Save 2 months
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Plans ── */}
      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <PlanCard plan={freePlan} yearly={yearly} />
            <PlanCard plan={proPlan} yearly={yearly} />
            <PlanCard plan={enterprisePlan} yearly={yearly} />
          </div>
        </div>
      </section>

      {/* ── Subcontractors always free ── */}
      <section className="border-y border-white/10 bg-white/[0.02] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-300">
            🔧 Subcontractors
          </div>
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Subcontractors always free
          </h2>
          <p className="text-lg leading-relaxed text-slate-400">
            Subcontractors invited by their contractor can create an account and use ClearClaim completely free — forever. Submit invoices, track payments, download certificates and manage your CIS returns at no cost.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-slate-400">
            {['Submit invoices', 'Track payments', 'Download certificates', 'CIS returns', 'Raise disputes', 'View compliance status'].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span> {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Frequently asked questions
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map(({ q, a }) => (
              <div
                key={q}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <h3 className="mb-2 font-semibold text-white">{q}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-900/40 via-blue-800/20 to-slate-900/40 p-12 text-center shadow-2xl shadow-blue-900/20">
          <div className="pointer-events-none absolute inset-0 rounded-3xl" aria-hidden>
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-600/10 to-transparent" />
          </div>
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Ready to get started?
          </h2>
          <p className="mb-10 text-lg text-slate-400">
            Join contractors already using ClearClaim. Free forever, or upgrade when you need more.
          </p>
          <Link
            href="/register/contractor"
            className="inline-block rounded-xl bg-blue-500 px-10 py-4 text-base font-semibold text-white shadow-xl shadow-blue-500/30 transition hover:bg-blue-400"
          >
            Start for Free
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="font-bold text-white">ClearClaim</span>
              </div>
              <span className="text-xs text-slate-500">Built for UK Construction</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <Link href="/" className="transition hover:text-white">Home</Link>
              <Link href="/login" className="transition hover:text-white">Sign In</Link>
              <Link href="/register/contractor" className="transition hover:text-white">Register</Link>
              <Link href="/pricing" className="transition hover:text-white">Pricing</Link>
              <Link href="/terms" className="transition hover:text-white">Terms</Link>
              <Link href="/privacy" className="transition hover:text-white">Privacy</Link>
            </div>
          </div>
          <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-slate-600">
            © 2026 ClearClaim. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  )
}
