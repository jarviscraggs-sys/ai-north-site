'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';

const mockups = [
  {
    title: 'AI Analytics Dashboard',
    description: 'Real-time insights powered by machine learning',
    gradient: 'from-[#00d4ff]/20 via-[#0ea5e9]/10 to-transparent',
    accent: '#00d4ff',
    rotate: '-6deg',
    delay: 0,
    items: [
      { label: 'Tickets Resolved', value: '2,847', change: '+73%' },
      { label: 'Cost Saved', value: '£14,200', change: 'this month' },
      { label: 'Avg Response', value: '0.3s', change: '-98%' },
    ],
    chart: [40, 65, 55, 80, 72, 90, 85, 95],
  },
  {
    title: 'AI Support Agent',
    description: 'Intelligent multi-channel customer support',
    gradient: 'from-[#7c3aed]/20 via-[#a855f7]/10 to-transparent',
    accent: '#a855f7',
    rotate: '0deg',
    delay: 0.1,
    items: [
      { label: 'Active Conversations', value: '142', change: 'live' },
      { label: 'Resolution Rate', value: '94%', change: '+22%' },
      { label: 'Escalations', value: '8', change: '-64%' },
    ],
    chart: [30, 45, 60, 55, 70, 65, 80, 88],
  },
  {
    title: 'Automation Pipeline',
    description: 'End-to-end workflow orchestration',
    gradient: 'from-[#06b6d4]/20 via-[#0ea5e9]/10 to-transparent',
    accent: '#06b6d4',
    rotate: '6deg',
    delay: 0.2,
    items: [
      { label: 'Tasks Automated', value: '18,490', change: 'this week' },
      { label: 'Time Saved', value: '340hrs', change: 'per month' },
      { label: 'Error Rate', value: '0.02%', change: '-99%' },
    ],
    chart: [55, 60, 70, 68, 75, 88, 82, 96],
  },
];

function MiniChart({ values, accent }: { values: number[]; accent: string }) {
  const max = Math.max(...values);
  const w = 100 / (values.length - 1);

  const points = values
    .map((v, i) => `${i * w},${100 - (v / max) * 80}`)
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" className="w-full h-16" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${accent}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={accent}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points={`0,100 ${points} 100,100`}
        fill={`url(#grad-${accent})`}
      />
    </svg>
  );
}

export default function ShowcaseSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      setMousePos({
        x: (e.clientX - rect.left - rect.width / 2) / rect.width,
        y: (e.clientY - rect.top - rect.height / 2) / rect.height,
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#7c3aed]/3 to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7c3aed]/30 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="text-xs text-[#7c3aed] tracking-widest uppercase font-medium">What We Build</span>
          <h2
            className="text-4xl md:text-5xl font-bold mt-3 mb-4 text-white"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}
          >
            Real AI. Real Results.
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Dashboards, agents, and pipelines — all designed around your specific problems.
          </p>
        </motion.div>

        <div ref={ref} className="relative flex flex-col md:flex-row items-center justify-center gap-6 md:gap-0 md:h-[480px]">
          {mockups.map((mockup, i) => {
            const parallaxX = mousePos.x * (i === 1 ? 8 : i === 0 ? 12 : 10) * (i === 2 ? -1 : 1);
            const parallaxY = mousePos.y * 6;

            return (
              <motion.div
                key={mockup.title}
                initial={{ opacity: 0, y: 60, rotate: mockup.rotate }}
                animate={inView ? {
                  opacity: 1,
                  y: 0,
                  rotate: mockup.rotate,
                  x: i === 0 ? '-30%' : i === 2 ? '30%' : '0%',
                } : {}}
                whileHover={{ scale: 1.04, zIndex: 10 }}
                transition={{ duration: 0.8, delay: mockup.delay, ease: 'easeOut' }}
                style={{
                  transform: `translateX(${parallaxX}px) translateY(${parallaxY}px)`,
                  zIndex: i === 1 ? 3 : i === 0 ? 2 : 1,
                  position: 'relative',
                }}
                className="md:absolute w-full md:w-[340px] cursor-default"
              >
                {/* Glassmorphism card */}
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${mockup.accent}30`,
                    boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 40px ${mockup.accent}10`,
                  }}
                >
                  {/* Card header */}
                  <div
                    className={`p-4 bg-gradient-to-br ${mockup.gradient} border-b`}
                    style={{ borderColor: `${mockup.accent}20` }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: mockup.accent }} />
                      <span className="text-xs font-mono" style={{ color: mockup.accent }}>LIVE</span>
                    </div>
                    <h3 className="text-white font-bold text-sm" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      {mockup.title}
                    </h3>
                    <p className="text-slate-500 text-xs">{mockup.description}</p>
                  </div>

                  {/* Stats */}
                  <div className="p-4 grid grid-cols-3 gap-3 border-b" style={{ borderColor: `${mockup.accent}10` }}>
                    {mockup.items.map((item) => (
                      <div key={item.label} className="text-center">
                        <div className="font-bold text-white text-sm" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                          {item.value}
                        </div>
                        <div className="text-xs" style={{ color: mockup.accent }}>{item.change}</div>
                        <div className="text-xs text-slate-600 truncate">{item.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Mini chart */}
                  <div className="px-4 pt-2 pb-4">
                    <MiniChart values={mockup.chart} accent={mockup.accent} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
