import { Link, Outlet, useLocation } from 'react-router-dom';
import Logo from '../components/Logo.jsx';

const TITLES = {
  '/login': 'Sign in to your account',
  '/signup': 'Create your account',
};

/**
 * Shared chrome for /login and /signup: brand on the left,
 * focused form card on the right.
 */
export default function AuthLayout() {
  const location = useLocation();
  const title = TITLES[location.pathname] || 'Welcome back';

  return (
    <div className="min-h-screen bg-ink-50 lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-ink-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(99,102,241,.45), transparent 45%), radial-gradient(circle at 80% 70%, rgba(139,92,246,.35), transparent 45%)',
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
          aria-hidden="true"
        />

        <div className="relative">
          <Link to="/" aria-label="VeriWrite AI home">
            <Logo size="md" showTagline />
          </Link>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-white">
            Know what was flagged.
            <br />
            <span className="gradient-text">Understand why.</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-300">
            VeriWrite AI analyzes academic submissions for suspicious writing patterns and provides
            explainable evidence instead of relying only on a percentage score.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {['Explainable evidence', 'Section-level signals', 'Probabilistic, never absolute'].map(
              (t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-ink-200"
                >
                  {t}
                </span>
              )
            )}
          </div>
        </div>

        <p className="relative text-xs text-ink-500">
          AI-detection is probabilistic. VeriWrite reports patterns, not verdicts.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen flex-col px-5 py-8 sm:px-10 lg:min-h-0 lg:justify-center">
        <div className="mb-10 lg:hidden">
          <Link to="/" aria-label="VeriWrite AI home">
            <Logo size="md" showTagline />
          </Link>
        </div>

        <div className="mx-auto w-full max-w-md animate-fade-up">
          <Outlet context={{ title }} />
        </div>

        <p className="mx-auto mt-10 max-w-md text-center text-xs text-ink-400">
          Protected by JWT sessions and bcrypt password hashing.
        </p>
      </div>
    </div>
  );
}
