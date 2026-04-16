'use client';

import { motion, useInView, type Variants } from 'framer-motion';
import { useRef } from 'react';

// Dot-grid UK map positions (simplified dot coords for North East England / UK shape)
// Sunderland/Newcastle region roughly at 55.0°N, 1.4°W
// We'll create a stylized dot-grid representation
const UK_DOTS: { x: number; y: number; size?: number }[] = [
  // Rough UK silhouette dots (normalised 0-100)
  // Scotland top
  { x: 42, y: 5 }, { x: 45, y: 4 }, { x: 48, y: 5 }, { x: 44, y: 8 }, { x: 47, y: 7 },
  { x: 40, y: 9 }, { x: 43, y: 10 }, { x: 46, y: 10 }, { x: 49, y: 9 }, { x: 51, y: 8 },
  { x: 38, y: 12 }, { x: 41, y: 13 }, { x: 44, y: 13 }, { x: 47, y: 12 }, { x: 50, y: 13 },
  { x: 53, y: 11 }, { x: 36, y: 15 }, { x: 39, y: 15 }, { x: 42, y: 16 }, { x: 45, y: 15 },
  { x: 48, y: 16 }, { x: 51, y: 15 }, { x: 54, y: 14 }, { x: 37, y: 18 }, { x: 40, y: 18 },
  { x: 43, y: 19 }, { x: 46, y: 18 }, { x: 49, y: 18 }, { x: 52, y: 18 }, { x: 55, y: 17 },
  // Northern England
  { x: 38, y: 21 }, { x: 41, y: 21 }, { x: 44, y: 21 }, { x: 47, y: 21 }, { x: 50, y: 21 },
  { x: 53, y: 21 }, { x: 56, y: 20 }, { x: 39, y: 24 }, { x: 42, y: 24 }, { x: 45, y: 24 },
  { x: 48, y: 24 }, { x: 51, y: 24 }, { x: 54, y: 23 }, { x: 57, y: 22 },
  // North East highlight zone (Sunderland/Newcastle area)
  { x: 52, y: 27 }, { x: 55, y: 26 }, { x: 58, y: 26 }, { x: 53, y: 29 }, { x: 56, y: 28 },
  { x: 59, y: 27 }, { x: 54, y: 31 }, { x: 57, y: 30 }, { x: 60, y: 29 },
  // Midlands
  { x: 40, y: 27 }, { x: 43, y: 27 }, { x: 46, y: 27 }, { x: 49, y: 27 },
  { x: 41, y: 30 }, { x: 44, y: 30 }, { x: 47, y: 30 }, { x: 50, y: 30 }, { x: 53, y: 30 },
  { x: 42, y: 33 }, { x: 45, y: 33 }, { x: 48, y: 33 }, { x: 51, y: 33 }, { x: 54, y: 32 },
  { x: 41, y: 36 }, { x: 44, y: 36 }, { x: 47, y: 36 }, { x: 50, y: 36 }, { x: 53, y: 35 },
  // South England
  { x: 38, y: 39 }, { x: 41, y: 39 }, { x: 44, y: 39 }, { x: 47, y: 39 }, { x: 50, y: 39 },
  { x: 53, y: 39 }, { x: 56, y: 38 }, { x: 39, y: 42 }, { x: 42, y: 42 }, { x: 45, y: 42 },
  { x: 48, y: 42 }, { x: 51, y: 42 }, { x: 54, y: 41 }, { x: 57, y: 40 },
  { x: 40, y: 45 }, { x: 43, y: 45 }, { x: 46, y: 45 }, { x: 49, y: 45 }, { x: 52, y: 45 },
  { x: 55, y: 44 }, { x: 41, y: 48 }, { x: 44, y: 48 }, { x: 47, y: 48 }, { x: 50, y: 47 },
  { x: 53, y: 47 }, { x: 42, y: 51 }, { x: 45, y: 51 }, { x: 48, y: 50 }, { x: 51, y: 50 },
  { x: 43, y: 54 }, { x: 46, y: 53 }, { x: 49, y: 53 },
  { x: 44, y: 57 }, { x: 47, y: 56 }, { x: 45, y: 60 }, { x: 48, y: 59 },
];

// Sunderland/Newcastle pulse point
const PULSE_POINT = { x: 56.5, y: 27.5 };

function UKMapBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 flex items-center justify-end pr-8 md:pr-16">
        <div className="relative w-[320px] h-[480px] opacity-20">
          {UK_DOTS.map((dot, i) => (
            <div
              key={i}
              className="absolute w-[3px] h-[3px] rounded-full bg-[#00d4ff]"
              style={{
                left: `${dot.x}%`,
                top: `${dot.y}%`,
                opacity: 0.5 + Math.random() * 0.5,
              }}
            />
          ))}

          {/* Sunderland/Newcastle pulse */}
          <div
            className="absolute"
            style={{ left: `${PULSE_POINT.x}%`, top: `${PULSE_POINT.y}%` }}
          >
            {/* Core dot */}
            <div className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00d4ff]"
              style={{ boxShadow: '0 0 12px #00d4ff, 0 0 24px #00d4ff80' }} />

            {/* Pulse rings */}
            {[0, 0.5, 1].map((delay) => (
              <motion.div
                key={delay}
                className="absolute rounded-full border border-[#00d4ff]/60"
                style={{ top: '-50%', left: '-50%' }}
                animate={{
                  width: ['12px', '60px'],
                  height: ['12px', '60px'],
                  opacity: [0.8, 0],
                  top: ['-6px', '-30px'],
                  left: ['-6px', '-30px'],
                }}
                transition={{
                  duration: 2.5,
                  delay,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

export default function CTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="relative py-32 overflow-hidden">
      {/* Glowing background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[#00d4ff]/8 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[#7c3aed]/10 blur-[80px]" />
      </div>

      {/* Grid */}
      <div className="absolute inset-0 grid-bg opacity-30" />

      {/* Horizontal lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00d4ff]/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7c3aed]/40 to-transparent" />

      {/* UK dot-grid map */}
      <UKMapBackground />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-[#00d4ff]"
            style={{
              left: `${10 + i * 8}%`,
              top: `${20 + (i % 3) * 30}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: 3 + i * 0.3,
              repeat: Infinity,
              delay: i * 0.4,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
        >
          {/* Eyebrow */}
          <motion.div variants={itemVariants} className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-3 glass rounded-full px-5 py-2 border border-[#00d4ff]/20">
              <span className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
              <span className="text-xs text-[#00d4ff] tracking-widest uppercase">The Bottom Line</span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h2
            variants={itemVariants}
            className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}
          >
            Stop Doing Manually
            <br />
            <span className="gradient-text">What AI Can Do For You.</span>
          </motion.h2>

          <motion.p variants={itemVariants} className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Every hour your team spends on repetitive tasks is an hour not spent on growth. Let&apos;s fix that — fast.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.a
              href="#contact"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="btn-neon text-sm py-4 px-10 inline-block"
            >
              ⚡ Start Now — It&apos;s Free To Talk
            </motion.a>
            <motion.a
              href="#services"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-block px-10 py-4 border border-slate-600 text-slate-300 hover:border-[#7c3aed] hover:text-white transition-all duration-300 rounded text-sm uppercase tracking-widest font-semibold"
            >
              See What We Build
            </motion.a>
          </motion.div>

          {/* Social proof */}
          <motion.div variants={itemVariants} className="mt-12 flex flex-wrap justify-center gap-8 text-xs text-slate-600">
            <span>✓ 40+ businesses transformed</span>
            <span>✓ Results in days, not months</span>
            <span>✓ UK-based team</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
