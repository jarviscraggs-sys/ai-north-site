import Link from 'next/link';

const businessTypes = [
  { icon: '💇', label: 'Hair & Beauty Salons' },
  { icon: '🍕', label: 'Restaurants & Takeaways' },
  { icon: '🔧', label: 'Tradesmen & Contractors' },
  { icon: '🏠', label: 'Estate Agents' },
  { icon: '💪', label: 'Gyms & Personal Trainers' },
  { icon: '⚖️', label: 'Professional Services' },
];

const steps = [
  {
    num: '1',
    title: 'Sign up & tell us about your business',
    desc: 'We set up your AI bot in minutes — trained on your services, hours and FAQs.',
  },
  {
    num: '2',
    title: 'Share your WhatsApp or Telegram link with customers',
    desc: 'Add it to your website, Instagram bio, Google listing — wherever your customers are.',
  },
  {
    num: '3',
    title: 'Watch bookings and enquiries come in automatically',
    desc: 'Your AI handles the chat 24/7. You just show up and do the work.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Nav */}
      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center text-base">
              💬
            </div>
            <span className="text-xl font-bold text-white">Clayo</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-slate-400 hover:text-white text-sm transition">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-sky-500/10 border border-sky-500/30 text-sky-400 text-sm font-medium px-4 py-2 rounded-full mb-8">
            🤖 AI-powered customer assistant for your business
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
            Never Miss a Customer{' '}
            <span className="text-sky-400">Enquiry Again</span>
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Clayo gives your business an AI assistant that handles bookings, answers questions and captures leads 24/7 — on WhatsApp or Telegram
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-sky-500 hover:bg-sky-400 text-white font-semibold px-8 py-4 rounded-xl text-lg transition shadow-lg shadow-sky-500/20"
            >
              Start Free Trial →
            </Link>
            <Link
              href="/demo"
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition"
            >
              See a Demo
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 bg-slate-800/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">How it works</h2>
          <p className="text-slate-400 text-center mb-16">Up and running in under 10 minutes</p>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.num} className="relative">
                <div className="w-12 h-12 bg-sky-500 rounded-xl flex items-center justify-center text-white font-bold text-lg mb-4">
                  {step.num}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">Who it&apos;s for</h2>
          <p className="text-slate-400 text-center mb-16">Any local business that gets customer enquiries</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {businessTypes.map((biz) => (
              <div
                key={biz.label}
                className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center hover:border-sky-500/50 transition"
              >
                <div className="text-4xl mb-3">{biz.icon}</div>
                <p className="text-white font-medium text-sm">{biz.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-20 bg-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">Simple pricing</h2>
          <p className="text-slate-400 text-center mb-16">No hidden fees. Cancel anytime.</p>

          <div className="grid md:grid-cols-2 gap-6 mb-10">
            {/* Starter */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-1">Starter</h3>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold text-white">£29</span>
                <span className="text-slate-400 mb-1">/mo</span>
              </div>
              <p className="text-slate-500 text-sm mb-6">+ £99 one-off setup</p>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2"><span className="text-sky-400">✓</span> Up to 500 messages/month</li>
                <li className="flex items-center gap-2"><span className="text-sky-400">✓</span> Telegram bot</li>
                <li className="flex items-center gap-2"><span className="text-sky-400">✓</span> Booking calendar</li>
                <li className="flex items-center gap-2"><span className="text-sky-400">✓</span> Enquiries inbox</li>
              </ul>
              <Link
                href="/signup"
                className="mt-8 block w-full text-center bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition"
              >
                Get started
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-slate-800 border-2 border-sky-500 rounded-2xl p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                MOST POPULAR
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Pro</h3>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold text-white">£49</span>
                <span className="text-slate-400 mb-1">/mo</span>
              </div>
              <p className="text-slate-500 text-sm mb-6">+ £149 one-off setup</p>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2"><span className="text-sky-400">✓</span> Unlimited messages</li>
                <li className="flex items-center gap-2"><span className="text-sky-400">✓</span> WhatsApp + Telegram</li>
                <li className="flex items-center gap-2"><span className="text-sky-400">✓</span> Booking calendar</li>
                <li className="flex items-center gap-2"><span className="text-sky-400">✓</span> Enquiries inbox</li>
                <li className="flex items-center gap-2"><span className="text-sky-400">✓</span> Priority support</li>
              </ul>
              <Link
                href="/signup"
                className="mt-8 block w-full text-center bg-sky-500 hover:bg-sky-400 text-white font-semibold py-3 rounded-lg transition"
              >
                Get started
              </Link>
            </div>
          </div>

          {/* Demo code */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
            <p className="text-slate-300 text-sm">
              🎁 <strong className="text-white">Have a demo code?</strong>{' '}
              Enter it at signup for free access
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">© 2026 Clayo. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-slate-500 hover:text-slate-400 text-sm transition">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-slate-500 hover:text-slate-400 text-sm transition">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
