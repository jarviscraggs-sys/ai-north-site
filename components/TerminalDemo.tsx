'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

const lines = [
  { type: 'prompt', text: '> Describe your problem' },
  { type: 'input', text: '"Our support team can\'t keep up with tickets"' },
  { type: 'prompt', text: '> Analyzing...' },
  { type: 'blank', text: '' },
  { type: 'success', text: '✓ AI Support Agent recommended' },
  { type: 'success', text: '✓ Estimated 73% ticket reduction' },
  { type: 'success', text: '✓ 24hr prototype ready' },
  { type: 'blank', text: '' },
  { type: 'prompt', text: '> Deploy? [Y/n]' },
  { type: 'input', text: 'Y' },
  { type: 'blank', text: '' },
  { type: 'highlight', text: '⚡ Deploying your AI agent...' },
  { type: 'highlight', text: '🚀 Live in 24 hours. Ready to transform your support?' },
];

const CHAR_SPEED = 35;
const LINE_DELAY = 200;

export default function TerminalDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [revealedLines, setRevealedLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (inView && !started) {
      setStarted(true);
    }
  }, [inView, started]);

  useEffect(() => {
    if (!started) return;
    if (currentLine >= lines.length) return;

    const line = lines[currentLine];

    if (line.type === 'blank') {
      const t = setTimeout(() => {
        setRevealedLines(prev => [...prev, '']);
        setCurrentLine(prev => prev + 1);
        setCurrentChar(0);
      }, LINE_DELAY);
      return () => clearTimeout(t);
    }

    if (currentChar < line.text.length) {
      const t = setTimeout(() => {
        setCurrentChar(prev => prev + 1);
      }, CHAR_SPEED);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setRevealedLines(prev => [...prev, line.text]);
        setCurrentLine(prev => prev + 1);
        setCurrentChar(0);
      }, LINE_DELAY);
      return () => clearTimeout(t);
    }
  }, [started, currentLine, currentChar]);

  const getLineColor = (type: string) => {
    switch (type) {
      case 'prompt': return 'text-[#00d4ff]';
      case 'input': return 'text-green-400';
      case 'success': return 'text-emerald-400';
      case 'highlight': return 'text-[#a855f7]';
      default: return 'text-slate-400';
    }
  };

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-10" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00d4ff]/20 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs text-[#00d4ff] tracking-widest uppercase font-medium">Live Demo</span>
          <h2
            className="text-4xl md:text-5xl font-bold mt-3 mb-4 text-white"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}
          >
            See It In Action
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            From problem to solution in a conversation. This is how fast AI North works.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto" ref={ref}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative rounded-xl overflow-hidden"
            style={{
              background: 'rgba(0,0,0,0.7)',
              border: '1px solid rgba(0, 212, 255, 0.2)',
              boxShadow: '0 0 40px rgba(0, 212, 255, 0.05), 0 25px 50px rgba(0,0,0,0.5)',
            }}
          >
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#00d4ff]/10 bg-black/30">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-2 text-xs text-slate-500 font-mono">ai-north — terminal</span>
            </div>

            {/* Terminal body */}
            <div className="p-6 font-mono text-sm min-h-[320px]">
              {revealedLines.map((line, i) => {
                const originalLine = lines[i];
                return (
                  <div key={i} className={`leading-relaxed ${originalLine ? getLineColor(originalLine.type) : ''}`}>
                    {line || <>&nbsp;</>}
                  </div>
                );
              })}

              {/* Currently typing line */}
              {currentLine < lines.length && (
                <div className={`leading-relaxed ${getLineColor(lines[currentLine].type)}`}>
                  {lines[currentLine].text.slice(0, currentChar)}
                  <span className="inline-block w-2 h-4 bg-[#00d4ff] ml-0.5 animate-pulse align-middle" />
                </div>
              )}

              {/* Final cursor blink when done */}
              {currentLine >= lines.length && (
                <div className="mt-1">
                  <span className="inline-block w-2 h-4 bg-[#00d4ff] animate-pulse" />
                </div>
              )}
            </div>
          </motion.div>

          {/* CTA below terminal */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="text-center mt-8"
          >
            <a href="#contact" className="btn-neon text-sm">
              ⚡ Start Your Own Conversation
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
