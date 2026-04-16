'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[99999] bg-[#020817] flex items-center justify-center overflow-hidden"
        >
          {/* Scanline sweep */}
          <motion.div
            initial={{ top: '-10%' }}
            animate={{ top: '110%' }}
            transition={{ duration: 1.2, ease: 'linear', delay: 0.2 }}
            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00d4ff] to-transparent pointer-events-none"
            style={{ boxShadow: '0 0 20px #00d4ff, 0 0 60px #00d4ff40' }}
          />

          {/* Logo */}
          <div className="flex flex-col items-center gap-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative"
            >
              {/* Logo mark */}
              <div className="relative w-16 h-16 mx-auto mb-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0.6, 1] }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="absolute inset-0 bg-[#00d4ff] rounded-sm opacity-20"
                />
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="absolute inset-[4px] border-2 border-[#00d4ff] rounded-sm"
                />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.5, type: 'spring' }}
                  className="absolute inset-[10px] bg-[#00d4ff] rounded-sm"
                />
              </div>

              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="text-3xl font-black tracking-widest"
                style={{ fontFamily: 'Rajdhani, sans-serif' }}
              >
                <span className="text-white">AI</span>
                <span className="text-[#00d4ff]"> NORTH</span>
              </motion.span>
            </motion.div>

            {/* Loading bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="w-48 h-px bg-slate-800 rounded-full overflow-hidden"
            >
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.0, delay: 0.6, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-[#00d4ff] to-[#7c3aed]"
              />
            </motion.div>
          </div>

          {/* Corner decorations */}
          <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-[#00d4ff]/40" />
          <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-[#00d4ff]/40" />
          <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-[#00d4ff]/40" />
          <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-[#00d4ff]/40" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
