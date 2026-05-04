'use client';

import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

const NeuralNetwork = dynamic(() => import('./NeuralNetwork'), { ssr: false });

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden" id="hero">
      {/* === STRIPE-STYLE ANIMATED GRADIENT MESH === */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Base mesh blobs — animate with CSS keyframes */}
        <div className="gradient-mesh-blob blob-1" />
        <div className="gradient-mesh-blob blob-2" />
        <div className="gradient-mesh-blob blob-3" />
        <div className="gradient-mesh-blob blob-4" />
        {/* Noise overlay for texture */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Grid background */}
      <div className="absolute inset-0 grid-bg opacity-40 z-0" />

      {/* 3D Canvas */}
      <div className="absolute inset-0 z-[1]">
        <NeuralNetwork />
      </div>

      {/* Floating particles overlay */}
      <div className="absolute inset-0 pointer-events-none z-[2]">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-[#00d4ff]"
            style={{
              left: `${(i * 13 + 7) % 100}%`,
              top: `${(i * 17 + 11) % 100}%`,
              opacity: 0.1 + (i % 5) * 0.08,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.1, 0.6, 0.1],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 3 + (i % 4),
              repeat: Infinity,
              delay: (i * 0.3) % 5,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-20 w-full">
        <div className="max-w-3xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-8 border border-[#00d4ff]/20"
          >
            <span className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
            <span className="text-xs text-[#00d4ff] tracking-widest uppercase font-medium">
              AI Consultancy • North of England
            </span>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-7xl font-black mb-6 leading-tight"
            style={{ fontFamily: 'Rajdhani, sans-serif', letterSpacing: '-0.02em' }}
          >
            <span className="text-white">Your Business</span>
            <br />
            <span className="text-white">Has Problems.</span>
            <br />
            <span className="gradient-text">AI Can Fix Them.</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-400 mb-10 max-w-xl leading-relaxed"
          >
            We design and deploy intelligent AI systems that automate your biggest bottlenecks, cut costs, and give you back time — in days, not months.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <a href="#contact" className="btn-neon text-center">
              ⚡ Start Your AI Journey
            </a>
            <a
              href="#services"
              className="px-8 py-3 border border-slate-600 text-slate-300 hover:border-[#7c3aed] hover:text-white transition-all duration-300 rounded text-sm uppercase tracking-widest font-semibold text-center"
            >
              Explore Services
            </a>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="flex flex-wrap gap-6 mt-12 text-xs text-slate-500 uppercase tracking-widest"
          >
            {['40+ Businesses Helped', '£2.4M Saved', '24h To Prototype'].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <span className="text-[#00d4ff]">■</span> {item}
              </span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10"
      >
        <span className="text-xs text-slate-600 uppercase tracking-widest">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-px h-8 bg-gradient-to-b from-[#00d4ff] to-transparent"
        />
      </motion.div>
    </section>
  );
}
