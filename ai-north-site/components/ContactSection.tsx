'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const industries = [
  'Retail', 'E-commerce', 'Professional Services', 'Healthcare', 'Logistics',
  'Hospitality', 'Manufacturing', 'Finance', 'Education', 'Other',
];

const budgets = [
  'Under £1,000', '£1,000 – £5,000', '£5,000 – £15,000', '£15,000 – £50,000', '£50,000+', 'Not sure yet',
];

type Status = 'idle' | 'scanning' | 'success' | 'error';

export default function ContactSection() {
  const [status, setStatus] = useState<Status>('idle');
  const [form, setForm] = useState({
    name: '', business: '', email: '', phone: '',
    industry: '', problem: '', budget: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('scanning');
    await new Promise((r) => setTimeout(r, 2500));
    setStatus('success');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <section id="contact" className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] rounded-full bg-[#7c3aed]/8 blur-[120px] -translate-y-1/2" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-[#00d4ff]/5 blur-[100px]" />
      </div>
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7c3aed]/30 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left side */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-xs text-[#7c3aed] tracking-widest uppercase font-medium">Get In Touch</span>
            <h2
              className="text-4xl md:text-5xl font-bold mt-3 mb-6 text-white"
              style={{ fontFamily: 'Rajdhani, sans-serif' }}
            >
              Let&apos;s Solve Your
              <br />
              <span className="gradient-text">Biggest Problem</span>
            </h2>

            <p className="text-slate-400 mb-8 leading-relaxed">
              Tell us what&apos;s holding your business back. We&apos;ll respond within 12 hours with a diagnosis and initial plan — no sales pitch, just solutions.
            </p>

            {/* Promise cards */}
            <div className="space-y-4">
              {[
                { icon: '⚡', title: '12hr Response', desc: 'We reply fast — always' },
                { icon: '🎯', title: '24hr Prototype', desc: 'Working demo, not a deck' },
                { icon: '🔒', title: 'No Pressure', desc: 'Free diagnosis, no commitment' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4 glass rounded-lg p-4 border border-white/5">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <div className="text-white font-semibold text-sm">{item.title}</div>
                    <div className="text-slate-500 text-xs">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right side — form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <AnimatePresence mode="wait">
              {status === 'success' ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass rounded-xl p-12 text-center border border-[#00d4ff]/20 h-full flex flex-col items-center justify-center gap-6"
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: 3 }}
                    className="text-6xl"
                  >
                    ✅
                  </motion.div>
                  <h3 className="text-2xl font-bold text-[#00d4ff]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    Message Received
                  </h3>
                  <p className="text-slate-400">
                    We&apos;ve got your message and will respond within 12 hours with an initial diagnosis. Watch your inbox.
                  </p>
                  <button
                    onClick={() => setStatus('idle')}
                    className="btn-neon text-xs mt-4"
                  >
                    Send Another
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  className="glass rounded-xl p-8 border border-white/5 space-y-5"
                >
                  {/* Corner accents */}
                  <span className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[#00d4ff]/40 rounded-tl-sm" />
                  <span className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[#00d4ff]/40 rounded-tr-sm" />
                  <span className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[#00d4ff]/40 rounded-bl-sm" />
                  <span className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[#00d4ff]/40 rounded-br-sm" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Name *</label>
                      <input
                        required
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="John Smith"
                        className="futuristic-input"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Business Name *</label>
                      <input
                        required
                        name="business"
                        value={form.business}
                        onChange={handleChange}
                        placeholder="Acme Ltd"
                        className="futuristic-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Email *</label>
                      <input
                        required
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="john@acme.co.uk"
                        className="futuristic-input"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Phone</label>
                      <input
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="07700 000000"
                        className="futuristic-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Industry *</label>
                      <select
                        required
                        name="industry"
                        value={form.industry}
                        onChange={handleChange}
                        className="futuristic-input"
                      >
                        <option value="" disabled>Select industry</option>
                        {industries.map((ind) => (
                          <option key={ind} value={ind} className="bg-[#020817]">{ind}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Budget Range</label>
                      <select
                        name="budget"
                        value={form.budget}
                        onChange={handleChange}
                        className="futuristic-input"
                      >
                        <option value="" disabled>Select budget</option>
                        {budgets.map((b) => (
                          <option key={b} value={b} className="bg-[#020817]">{b}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">
                      Describe Your Problem *
                    </label>
                    <textarea
                      required
                      name="problem"
                      value={form.problem}
                      onChange={handleChange}
                      placeholder="Tell us what's slowing you down, costing you money, or frustrating your team..."
                      rows={4}
                      className="futuristic-input resize-none"
                    />
                  </div>

                  {/* Submit button */}
                  <motion.button
                    type="submit"
                    disabled={status === 'scanning'}
                    whileHover={status === 'idle' ? { scale: 1.02 } : {}}
                    whileTap={status === 'idle' ? { scale: 0.98 } : {}}
                    className={`relative w-full py-4 rounded font-bold text-sm uppercase tracking-widest overflow-hidden transition-all duration-300 ${
                      status === 'scanning'
                        ? 'bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/50 cursor-wait'
                        : 'btn-neon'
                    }`}
                  >
                    {/* Scanning line */}
                    {status === 'scanning' && (
                      <motion.div
                        className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00d4ff] to-transparent"
                        animate={{ top: ['-10%', '120%'] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                      />
                    )}

                    <span className="relative z-10">
                      {status === 'scanning' ? '⟳  Processing...' : '⚡ Send Message'}
                    </span>
                  </motion.button>

                  <p className="text-xs text-slate-600 text-center">
                    No spam, no selling your data. We reply within 12 hours.
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
