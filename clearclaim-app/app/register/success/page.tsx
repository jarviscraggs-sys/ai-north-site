import Link from 'next/link';

export default function RegisterSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl mb-4 shadow-lg shadow-blue-500/25">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">ClearClaim</h1>
        </div>

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-2xl text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-green-500/20 border border-green-400/30 rounded-full mx-auto mb-6">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">Account Created Successfully! ✅</h2>

          <p className="text-gray-300 mb-8 leading-relaxed">
            Welcome to ClearClaim. You can now log in with your email and password.
          </p>

          <Link
            href="/login"
            className="inline-block w-full py-3 px-6 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl transition shadow-lg shadow-blue-500/30 text-center"
          >
            Go to Login →
          </Link>
        </div>
      </div>
    </div>
  );
}
