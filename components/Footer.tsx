'use client';

export default function Footer() {
  return (
    <footer className="relative border-t border-white/5 py-12">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00d4ff]/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 bg-[#00d4ff] rounded-sm opacity-20" />
              <div className="absolute inset-[2px] border border-[#00d4ff] rounded-sm" />
              <div className="absolute inset-[6px] bg-[#00d4ff] rounded-sm" />
            </div>
            <span className="font-bold text-lg tracking-wider" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              <span className="text-white">AI</span>
              <span className="text-[#00d4ff]"> NORTH</span>
            </span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-500 uppercase tracking-widest">
            {['Services', 'Process', 'FAQ', 'Contact'].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="hover:text-[#00d4ff] transition-colors"
              >
                {link}
              </a>
            ))}
          </div>

          {/* Copyright */}
          <div className="text-xs text-slate-600">
            © {new Date().getFullYear()} AI North · ai-north.net
          </div>
        </div>

        {/* Tagline */}
        <div className="mt-8 text-center text-xs text-slate-700 tracking-widest uppercase">
          Your business has problems. AI can fix them.
        </div>
      </div>
    </footer>
  );
}
