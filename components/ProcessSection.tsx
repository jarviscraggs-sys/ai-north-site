'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

const steps = [
  {
    number: '01',
    title: 'Describe Your Problem',
    description: 'Tell us what\'s slowing you down. No jargon required — just describe what\'s painful, slow, or expensive in plain English.',
    icon: '💬',
    color: '#00d4ff',
  },
  {
    number: '02',
    title: 'We Diagnose',
    description: 'Our team analyses your workflow, identifies AI opportunities, and maps out a custom solution designed specifically for your business.',
    icon: '🔍',
    color: '#7c3aed',
  },
  {
    number: '03',
    title: 'We Build',
    description: 'We design, develop, and test your AI system. You get a working prototype within 24 hours — not weeks of PowerPoint decks.',
    icon: '⚙️',
    color: '#06b6d4',
  },
  {
    number: '04',
    title: 'See Results',
    description: 'Your system goes live. We monitor, iterate, and optimise. You watch the hours saved, costs cut, and revenue grow.',
    icon: '📈',
    color: '#a855f7',
  },
];

export default function ProcessSection() {
  const gridRef = useRef<HTMLDivElement>(null);
  const inView = useInView(gridRef, { once: true, margin: '-80px' });

  return (
    <section id="process" className="relative py-24 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#7c3aed]/5 blur-[100px]" />
      </div>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7c3aed]/30 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-xs text-[#7c3aed] tracking-widest uppercase font-medium">How It Works</span>
          <h2
            className="text-4xl md:text-5xl font-bold mt-3 mb-4 text-white"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}
          >
            From Problem To Solution In Days
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            A proven 4-step process that goes from conversation to live AI system faster than you thought possible.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-24 left-0 right-0 h-px">
            <div className="absolute inset-0 bg-gradient-to-r from-[#00d4ff]/20 via-[#7c3aed]/40 to-[#a855f7]/20" />
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="absolute inset-0 bg-gradient-to-r from-[#00d4ff] via-[#7c3aed] to-[#a855f7] origin-left"
              style={{ opacity: 0.3 }}
            />
          </div>

          <motion.div
            ref={gridRef}
            className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
          >
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0 } }}
                className="relative group"
              >
                {/* Node */}
                <div className="relative mb-8 flex justify-center">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="relative w-16 h-16 rounded-full flex items-center justify-center z-10"
                    style={{
                      background: `radial-gradient(circle, ${step.color}22, transparent)`,
                      border: `2px solid ${step.color}`,
                      boxShadow: `0 0 20px ${step.color}40`,
                    }}
                  >
                    <span className="text-2xl">{step.icon}</span>

                    {/* Pulse ring */}
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.5 }}
                      style={{ border: `1px solid ${step.color}` }}
                    />
                  </motion.div>
                </div>

                {/* Content */}
                <div className="text-center">
                  <div
                    className="text-5xl font-black mb-2 opacity-10 group-hover:opacity-30 transition-opacity"
                    style={{ color: step.color, fontFamily: 'Rajdhani, sans-serif' }}
                  >
                    {step.number}
                  </div>
                  <h3
                    className="text-lg font-bold text-white mb-3"
                    style={{ fontFamily: 'Rajdhani, sans-serif' }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Arrow (mobile) */}
                {i < steps.length - 1 && (
                  <div className="md:hidden flex justify-center mt-6">
                    <motion.div
                      animate={{ y: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-[#7c3aed]"
                    >
                      ↓
                    </motion.div>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
