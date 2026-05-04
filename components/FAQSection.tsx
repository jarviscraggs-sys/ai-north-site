'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';

const faqs = [
  {
    q: 'How quickly can you deliver a working solution?',
    a: 'We typically have a working prototype within 24 hours of our diagnosis call. Full deployment depends on complexity — simple automations go live in days, complex integrations within 2-3 weeks.',
  },
  {
    q: 'Do I need technical knowledge to work with you?',
    a: 'Not at all. You describe the problem in plain English, we handle everything technical. We explain what we\'re building in plain terms throughout the process.',
  },
  {
    q: 'What industries do you work with?',
    a: 'We\'ve worked across retail, professional services, healthcare administration, logistics, e-commerce, hospitality, and more. If your business has repetitive processes, we can help.',
  },
  {
    q: 'How much does it cost?',
    a: 'Every project is different. We offer everything from small automation packages starting at a few hundred pounds to full AI transformation programmes. We\'ll quote once we understand your problem — no surprise fees.',
  },
  {
    q: 'Will AI replace my employees?',
    a: 'We design AI to augment your team, not replace them. The goal is to free your people from repetitive, low-value work so they can do the high-value things only humans can do.',
  },
  {
    q: 'What happens after launch?',
    a: 'We monitor, maintain, and optimise your systems. We\'re not a one-and-done agency — we build long-term partnerships and iterate as your business grows.',
  },
  {
    q: 'Is my business data secure?',
    a: 'Yes. We follow UK data protection standards and GDPR requirements. All integrations are built with security-first principles, and we can work within your existing security policies.',
  },
];

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="faq" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-15" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00d4ff]/20 to-transparent" />

      <div className="relative z-10 max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-xs text-[#00d4ff] tracking-widest uppercase font-medium">Got Questions?</span>
          <h2
            className="text-4xl md:text-5xl font-bold mt-3 mb-4 text-white"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}
          >
            Frequently Asked
          </h2>
        </motion.div>

        <motion.div
          ref={ref}
          className="space-y-3"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
        >
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            >
              <div
                className={`glass rounded-lg overflow-hidden border transition-all duration-300 ${
                  open === i
                    ? 'border-[#00d4ff]/30 shadow-lg shadow-[#00d4ff]/10'
                    : 'border-white/5 hover:border-[#00d4ff]/15'
                }`}
              >
                <button
                  className="w-full flex items-center justify-between p-5 text-left gap-4 group"
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  <span
                    className={`font-semibold transition-colors duration-300 ${
                      open === i ? 'text-[#00d4ff]' : 'text-slate-200 group-hover:text-white'
                    }`}
                  >
                    {faq.q}
                  </span>

                  <motion.span
                    animate={{ rotate: open === i ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex-shrink-0 w-6 h-6 flex items-center justify-center border rounded-sm text-sm transition-colors ${
                      open === i
                        ? 'border-[#00d4ff] text-[#00d4ff]'
                        : 'border-slate-600 text-slate-400'
                    }`}
                  >
                    +
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="px-5 pb-5 text-slate-400 text-sm leading-relaxed border-t border-[#00d4ff]/10 pt-4">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
