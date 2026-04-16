'use client';

import { motion } from 'framer-motion';

const logos = [
  { name: 'NorthTech', abbr: 'NT' },
  { name: 'Wearside Digital', abbr: 'WD' },
  { name: 'Tyne Systems', abbr: 'TS' },
  { name: 'Durham Data', abbr: 'DD' },
  { name: 'Sunderland AI', abbr: 'SA' },
  { name: 'Nexus Group', abbr: 'NG' },
  { name: 'PitchNorth', abbr: 'PN' },
  { name: 'Coastal Labs', abbr: 'CL' },
  { name: 'Grid Works', abbr: 'GW' },
  { name: 'Aurora Tech', abbr: 'AT' },
];

function LogoItem({ logo }: { logo: typeof logos[0] }) {
  return (
    <div className="flex-shrink-0 flex items-center gap-3 px-8 py-3 mx-4 glass rounded-lg border border-white/5 group hover:border-[#00d4ff]/20 transition-colors duration-300">
      {/* Stylized logo mark */}
      <div
        className="w-8 h-8 rounded flex items-center justify-center text-xs font-black text-[#00d4ff] flex-shrink-0"
        style={{ background: 'rgba(0,212,255,0.08)', fontFamily: 'Rajdhani, sans-serif' }}
      >
        {logo.abbr}
      </div>
      <span className="text-slate-400 text-sm font-medium whitespace-nowrap group-hover:text-slate-300 transition-colors">
        {logo.name}
      </span>
    </div>
  );
}

export default function LogoTicker() {
  const doubled = [...logos, ...logos];

  return (
    <section className="relative py-16 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #020817, transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, #020817, transparent)' }} />

      <div className="relative z-0 max-w-7xl mx-auto px-6 mb-8">
        <p className="text-center text-xs text-slate-600 tracking-widest uppercase font-medium">
          Trusted by businesses across the North East
        </p>
      </div>

      {/* Ticker */}
      <div className="relative overflow-hidden">
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{
            duration: 25,
            ease: 'linear',
            repeat: Infinity,
          }}
          className="flex items-center"
          style={{ width: 'max-content' }}
        >
          {doubled.map((logo, i) => (
            <LogoItem key={i} logo={logo} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
