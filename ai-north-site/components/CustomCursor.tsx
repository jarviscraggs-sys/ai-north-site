'use client';

import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const trailPos = useRef({ x: -100, y: -100 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // Only on non-touch devices
    if (typeof window === 'undefined' || window.matchMedia('(hover: none)').matches) return;

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', onMove);

    const animate = () => {
      // Lag for trail
      trailPos.current.x += (pos.current.x - trailPos.current.x) * 0.12;
      trailPos.current.y += (pos.current.y - trailPos.current.y) * 0.12;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${pos.current.x - 5}px, ${pos.current.y - 5}px)`;
      }
      if (trailRef.current) {
        trailRef.current.style.transform = `translate(${trailPos.current.x - 16}px, ${trailPos.current.y - 16}px)`;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      {/* Outer trailing ring */}
      <div
        ref={trailRef}
        className="cursor-trail fixed top-0 left-0 pointer-events-none z-[9999] w-8 h-8 rounded-full border border-[#00d4ff]/40 hidden md:block"
        style={{ transition: 'none', willChange: 'transform' }}
      />
      {/* Inner glowing dot */}
      <div
        ref={dotRef}
        className="cursor-dot fixed top-0 left-0 pointer-events-none z-[9999] w-2.5 h-2.5 rounded-full bg-[#00d4ff] hidden md:block"
        style={{
          boxShadow: '0 0 8px #00d4ff, 0 0 20px #00d4ff60',
          transition: 'none',
          willChange: 'transform',
        }}
      />
    </>
  );
}
