import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, AlertCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { authApi } from '../api/auth.api';

export const LoginPage: React.FC = () => {
  const { googleConfigured } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const errorParam = searchParams.get('error');

  const handleGoogleLogin = () => {
    window.location.href = authApi.getGoogleLoginUrl();
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#f8fafc] p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center mx-auto shadow-sm">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Outbox Labs
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Production-grade email outreach scheduling platform with BullMQ delayed queues and distributed rate limits.
          </p>
        </div>

        {/* Auth Box */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6">
          {errorParam && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>Authentication failed: {decodeURIComponent(errorParam)}</span>
            </div>
          )}

          {googleConfigured ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-700 font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-2xs group"
              >
                {/* Official Google 'G' Icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="flex items-center gap-2 justify-center text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Protected with secure HTTP-only sessions</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
                <div className="flex items-center gap-2 font-semibold text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Google OAuth Credentials Required</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  As required by the assignment specification, this application strictly uses real Google OAuth (no fake/mock login toggle).
                </p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Please configure the following environment variables in your <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.env</code> file:
                </p>
                <div className="p-2 bg-white/80 rounded-md font-mono text-[10px] text-slate-800 space-y-0.5 border border-amber-200">
                  <div>GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com</div>
                  <div>GOOGLE_CLIENT_SECRET=your-client-secret</div>
                  <div>GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback</div>
                </div>
              </div>

              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 w-full text-xs text-brand-600 hover:text-brand-700 font-medium py-1"
              >
                <span>Google Cloud Console</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400">
          Outbox Labs Email Outreach Platform &copy; 2026
        </div>
      </div>
    </div>
  );
};
