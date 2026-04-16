'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const links = ['Services', 'Process', 'Stats', 'FAQ', 'Contact'];

  return (
    <>
      {/* === SCROLL PROGRESS INDICATOR === */}
      <motion.div
        style={{ scaleX, transformOrigin: '0% 50%' }}
        className="fixed top-0 left-0 right-0 h-[2px] z-[100]"
        aria-hidden="true"
      >
        <div
          className="h-full w-full"
          style={{
            background: 'linear-gradient(90deg, #00d4ff, #7c3aed, #a855f7)',
            boxShadow: '0 0 8px #00d4ff60',
          }}
        />
      </motion.div>

      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-[#020817]/80 backdrop-blur-xl border-b border-[#00d4ff]/10 shadow-lg shadow-[#00d4ff]/5'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 bg-[#00d4ff] rounded-sm opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="absolute inset-[3px] border border-[#00d4ff] rounded-sm" />
              <div className="absolute inset-[7px] bg-[#00d4ff] rounded-sm" />
            </div>
            <span
              className="font-bold text-xl tracking-wider"
              style={{ fontFamily: 'Rajdhani, sans-serif' }}
            >
              <span className="text-white">AI</span>
              <span className="text-[#00d4ff]"> NORTH</span>
            </span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="text-sm text-slate-400 hover:text-[#00d4ff] transition-colors duration-300 tracking-wider uppercase font-medium relative group"
              >
                {link}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#00d4ff] group-hover:w-full transition-all duration-300" />
              </a>
            ))}
            <a
              href="#contact"
              className="btn-neon text-xs py-2 px-5"
            >
              Get Started
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <span className={`block w-6 h-0.5 bg-[#00d4ff] transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-6 h-0.5 bg-[#00d4ff] transition-all duration-300 ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-6 h-0.5 bg-[#00d4ff] transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#020817]/95 backdrop-blur-xl border-t border-[#00d4ff]/10"
            >
              <div className="px-6 py-4 flex flex-col gap-4">
                {links.map((link) => (
                  <a
                    key={link}
                    href={`#${link.toLowerCase()}`}
                    onClick={() => setMobileOpen(false)}
                    className="text-sm text-slate-400 hover:text-[#00d4ff] transition-colors tracking-wider uppercase"
                  >
                    {link}
                  </a>
                ))}
                <a href="#contact" className="btn-neon text-center text-xs py-2">
                  Get Started
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
}
