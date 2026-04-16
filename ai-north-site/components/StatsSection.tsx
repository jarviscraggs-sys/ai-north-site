'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

interface Stat {
  value: number;
  suffix: string;
  prefix: string;
  label: string;
  description: string;
}

const stats: Stat[] = [
  { value: 40, suffix: '+', prefix: '', label: 'Businesses Helped', description: 'Across every sector' },
  { value: 2.4, suffix: 'M', prefix: '£', label: 'Total Savings', description: 'Delivered to clients' },
  { value: 12, suffix: 'hrs', prefix: '', label: 'Avg Response', description: 'We move fast' },
  { value: 24, suffix: 'hrs', prefix: '', label: 'To Prototype', description: 'Concept to working demo' },
];

function CountUp({ value, suffix, prefix, active }: { value: number; suffix: string; prefix: string; active: boolean }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) return;
    const duration = 2000;
    const start = performance.now();

    const update = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = value * ease;
      setDisplay(current);
      if (progress < 1) {
        frameRef.current = setTimeout(() => update(performance.now()), 16);
      }
    };

    frameRef.current = setTimeout(() => update(performance.now()), 16);
    return () => { if (frameRef.current) clearTimeout(frameRef.current); };
  }, [active, value]);

  const formatted = value < 10 ? display.toFixed(1) : Math.round(display).toString();

  return (
    <span>
      {prefix}{formatted}{suffix}
    </span>
  );
}

export default function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setActive(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="stats" className="relative py-24 overflow-hidden" ref={ref}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00d4ff]/3 to-transparent" />
      <div className="absolute inset-0 grid-bg opacity-30" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-xs text-[#00d4ff] tracking-widest uppercase font-medium">Proven Results</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-3 text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Numbers Don&apos;t Lie
          </h2>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-6"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
              className="relative group"
            >
              <div className="glass rounded-lg p-6 md:p-8 text-center glow-border-animated h-full">
                {/* Glow behind card */}
                <div className="absolute inset-0 rounded-lg bg-[#00d4ff]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />

                {/* Counter */}
                <div
                  className="text-4xl md:text-5xl font-black text-[#00d4ff] mb-2 glow-blue"
                  style={{ fontFamily: 'Rajdhani, sans-serif' }}
                >
                  <CountUp
                    value={stat.value}
                    suffix={stat.suffix}
                    prefix={stat.prefix}
                    active={active}
                  />
                </div>

                <div className="text-white font-semibold text-sm mb-1">{stat.label}</div>
                <div className="text-slate-500 text-xs">{stat.description}</div>

                {/* Corner accents */}
                <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-[#00d4ff]/40" />
                <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-[#00d4ff]/40" />
                <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-[#00d4ff]/40" />
                <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-[#00d4ff]/40" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
