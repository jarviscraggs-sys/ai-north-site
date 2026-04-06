import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
          <div className="w-64 h-64 rounded-full bg-blue-600/15 blur-[80px]" />
        </div>

        <div className="relative">
          <h1 className="text-[120px] font-black text-white leading-none tracking-tighter opacity-20 select-none">
            404
          </h1>
          <div className="-mt-8 mb-6">
            <h2 className="text-3xl font-bold text-white mb-3">Page not found</h2>
            <p className="text-slate-400 text-base">
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition shadow-lg shadow-blue-600/20"
            >
              🏠 Go to Homepage
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/20 hover:border-white/40 text-white/80 hover:text-white font-semibold rounded-xl transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
