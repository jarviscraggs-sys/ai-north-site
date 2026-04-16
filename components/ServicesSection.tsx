'use client';

import { useState } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { useRef } from 'react';

const services = [
  {
    icon: '⚡',
    title: 'Automation',
    description: 'Eliminate repetitive tasks with intelligent automation pipelines. From document processing to multi-step workflows — we automate the grind so your team focuses on what matters.',
    color: '#00d4ff',
    features: ['Process automation', 'Workflow orchestration', 'RPA integration'],
  },
  {
    icon: '🤖',
    title: 'AI Support Systems',
    description: 'Deploy AI agents that handle customer queries 24/7 — with the intelligence to escalate when needed. Cut support costs while improving response quality.',
    color: '#7c3aed',
    features: ['24/7 AI chat', 'Smart escalation', 'Multi-channel support'],
  },
  {
    icon: '📊',
    title: 'AI Analytics',
    description: 'Transform raw data into actionable intelligence. AI-powered dashboards, predictive insights, and anomaly detection that give you an unfair advantage.',
    color: '#06b6d4',
    features: ['Predictive analytics', 'Real-time dashboards', 'Anomaly detection'],
  },
  {
    icon: '✍️',
    title: 'Content at Scale',
    description: 'Produce high-quality content at 100x the speed. Product descriptions, marketing copy, social content — all on-brand, all automated, all yours.',
    color: '#a855f7',
    features: ['Brand-aligned AI', 'Multi-format output', 'SEO optimisation'],
  },
  {
    icon: '🔗',
    title: 'AI Integrations',
    description: 'Connect AI capabilities to your existing tools. CRM, ERP, Slack, Shopify, SAP — we build the bridges that make AI work inside your current stack.',
    color: '#0ea5e9',
    features: ['API development', 'Legacy system connectors', 'Real-time sync'],
  },
  {
    icon: '🧭',
    title: 'AI Strategy Mapping',
    description: 'Not sure where to start? We audit your business, identify the highest-value AI opportunities, and build a phased roadmap you can actually execute.',
    color: '#6366f1',
    features: ['AI readiness audit', 'ROI prioritisation', 'Phased roadmap'],
  },
];

// Animated dot-grid background pattern SVG
function DotGrid({ color }: { color: string }) {
  return (
    <div
      className="absolute inset-0 opacity-[0.06] pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(circle, ${color} 1px, transparent 1px)`,
        backgroundSize: '20px 20px',
      }}
    />
  );
}

// Animated gradient border component
function AnimatedBorder({ color, active }: { color: string; active: boolean }) {
  return (
    <div
      className="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-300"
      style={{
        opacity: active ? 1 : 0,
        background: `linear-gradient(#0a0f1e, #0a0f1e) padding-box,
          linear-gradient(var(--angle, 0deg), ${color}, transparent 40%, ${color}) border-box`,
        border: '1px solid transparent',
        animation: active ? 'rotateBorder 2.5s linear infinite' : 'none',
      }}
    />
  );
}

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
  },
};

export default function ServicesSection() {
  const [hovered, setHovered] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="services" className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00d4ff]/30 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs text-[#00d4ff] tracking-widest uppercase font-medium">What We Build</span>
          <h2
            className="text-4xl md:text-5xl font-bold mt-3 mb-4 text-white"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}
          >
            AI Solutions For Every Challenge
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            From quick wins to full transformations — we&apos;ve got the tools and expertise to solve your most pressing business problems.
          </p>
        </motion.div>

        {/* Services grid */}
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              variants={cardVariants}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              whileHover={{
                scale: 1.03,
                transition: { duration: 0.25 },
              }}
              className="relative group cursor-default"
            >
              <div
                className="relative rounded-xl p-7 h-full overflow-hidden transition-shadow duration-500"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${hovered === i ? service.color + '40' : 'rgba(255,255,255,0.06)'}`,
                  boxShadow: hovered === i
                    ? `0 20px 60px rgba(0,0,0,0.4), 0 0 30px ${service.color}20`
                    : '0 4px 24px rgba(0,0,0,0.2)',
                  transition: 'border-color 0.3s, box-shadow 0.3s',
                }}
              >
                {/* Dot grid background pattern */}
                <DotGrid color={service.color} />

                {/* Hover inner glow */}
                <div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at 50% 0%, ${service.color}12, transparent 70%)`,
                  }}
                />

                <div className="relative z-10">
                  {/* Icon with rotation on hover */}
                  <motion.div
                    animate={hovered === i ? { rotate: 360 } : { rotate: 0 }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                    className="text-4xl mb-5 inline-block"
                    style={{ display: 'inline-block', transformOrigin: 'center' }}
                  >
                    {service.icon}
                  </motion.div>

                  {/* Color bar */}
                  <div
                    className="w-8 h-0.5 mb-4 rounded-full transition-all duration-300 group-hover:w-16"
                    style={{ background: service.color }}
                  />

                  {/* Title */}
                  <h3
                    className="text-xl font-bold text-white mb-3 group-hover:text-[#00d4ff] transition-colors duration-300"
                    style={{ fontFamily: 'Rajdhani, sans-serif' }}
                  >
                    {service.title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-400 text-sm leading-relaxed mb-5">
                    {service.description}
                  </p>

                  {/* Features */}
                  <ul className="space-y-1.5">
                    {service.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2 text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                        <span style={{ color: service.color }}>▸</span>
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Corner accent */}
                <div
                  className="absolute bottom-0 right-0 w-20 h-20 opacity-10 group-hover:opacity-25 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: `linear-gradient(225deg, ${service.color}, transparent)`,
                    borderRadius: '0 0 12px 0',
                  }}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
