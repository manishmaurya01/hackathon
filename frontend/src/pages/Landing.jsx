import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ScanSearch,
  FileText,
  Braces,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import Logo from '../components/Logo.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

const NAV = [
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How It Works' },
  { href: '#integration', label: 'Integration' },
];

const FEATURES = [
  {
    icon: ScanSearch,
    title: 'Pattern detection',
    body: 'Flags uniform sentence structure, repetitive phrasing, templated wording and abrupt style shifts across the submission.',
  },
  {
    icon: FileText,
    title: 'Section-level evidence',
    body: 'Every finding quotes the original text and names the section it came from, so a reviewer can verify it in seconds.',
  },
  {
    icon: Braces,
    title: 'Probabilistic by design',
    body: 'Reports express AI-likelihood and confidence in plain language — never a bare percentage that pretends to be a fact.',
  },
  {
    icon: ShieldCheck,
    title: 'Explainable report',
    body: 'Signals, evidence and recommended next steps are structured for a human reviewer, not just a score to screenshot.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Submit the assignment',
    body: 'Upload a PDF, DOCX or TXT file, or paste the text directly. Content is extracted and split into reviewable sections.',
  },
  {
    n: '02',
    title: 'Analyse writing patterns',
    body: 'A structured model pass examines sentence structure, vocabulary, repetition and consistency, then returns validated JSON.',
  },
  {
    n: '03',
    title: 'Review the evidence',
    body: 'Signals arrive with quoted excerpts and confidence levels. Click any item to jump straight to the flagged section.',
  },
];

const MOCK_SIGNALS = [
  { label: 'Repetitive Phrasing', severity: 'Moderate', tone: 'badge-warn' },
  { label: 'Uniform Sentence Length', severity: 'Low', tone: 'badge-info' },
  { label: 'Formality Inconsistency', severity: 'Moderate', tone: 'badge-warn' },
];

function MockReport() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`card overflow-hidden transition-all duration-700 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-ink-200 bg-ink-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-ink-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink-300" />
        <span className="ml-3 truncate font-mono text-[11px] text-ink-500">
          report / authenticity-report
        </span>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              Authenticity Report
            </p>
            <p className="mt-1 text-sm font-semibold text-ink-900">Modern Literature Review.docx</p>
            <p className="mt-0.5 text-xs text-ink-500">Generated 24 Sep 2026</p>
          </div>
          <span className="badge-warn">Needs Attention</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { k: 'AI-likelihood', v: 'Elevated', cls: 'text-amber-600' },
            { k: 'Confidence', v: 'Moderate', cls: 'text-brand-600' },
            { k: 'Sections Flagged', v: '3', cls: 'text-ink-900' },
          ].map((s) => (
            <div key={s.k} className="rounded-lg border border-ink-200 bg-ink-50/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                {s.k}
              </p>
              <p className={`mt-1 text-lg font-bold ${s.cls}`}>{s.v}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            Signals Detected
          </p>
          <div className="flex flex-wrap gap-2">
            {MOCK_SIGNALS.map((s, i) => (
              <span
                key={s.label}
                className={`${s.tone} transition-all duration-500`}
                style={{
                  transitionDelay: `${i * 120}ms`,
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(6px)',
                }}
              >
                {s.label} · {s.severity}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-brand-100 bg-brand-50/60 p-3.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold text-brand-600">SECTION 04</span>
            <span className="badge-info !py-0.5 !text-[10px]">Moderate</span>
          </div>
          <p className="mt-2 text-[13px] italic leading-relaxed text-ink-700">
            “It is important to note that the transition was neither immediate nor uniform…”
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-500">
            The section opens with a stock connective and repeats the cadence used in the
            preceding section.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { isAuthenticated } = useAuth();

  const dashboardHref = isAuthenticated ? '/dashboard' : '/signup';

  return (
    <div className="min-h-screen bg-white text-ink-900">
      {/* ---------------- Navbar ---------------- */}
      <header className="sticky top-0 z-40 border-b border-ink-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="VeriWrite AI home">
            <Logo size="sm" />
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="text-sm font-medium text-ink-600 transition-colors hover:text-ink-900"
              >
                {n.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="btn-ghost text-ink-700">
              Login
            </Link>
            <Link to={dashboardHref} className="btn-primary">
              Get Started
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(900px 420px at 15% -5%, rgba(99,102,241,.14), transparent 60%), radial-gradient(700px 380px at 85% 10%, rgba(139,92,246,.10), transparent 60%)',
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.5]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(15,23,42,.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,.045) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 75% 60% at 50% 0%, black, transparent)',
          }}
          aria-hidden="true"
        />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
          <div className="animate-fade-up">
            <span className="badge-info">
              <Sparkles size={13} />
              Explainable AI detection for academic work
            </span>

            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-ink-950 sm:text-5xl lg:text-[3.4rem]">
              Know what was flagged.
              <br />
              <span className="gradient-text">Understand why.</span>
            </h1>

            <p className="mt-5 max-w-xl text-[16.5px] leading-relaxed text-ink-600">
              VeriWrite AI analyzes academic submissions for suspicious writing patterns and
              provides explainable evidence instead of relying only on a percentage score.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/analyze" className="btn-primary !px-5 !py-3 !text-[15px]">
                Analyze an Assignment
                <ArrowRight size={16} />
              </Link>
              <Link to="/signup" className="btn-secondary !px-5 !py-3 !text-[15px]">
                Explore Demo
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
              {['No percentage verdicts', 'Quoted evidence per signal', 'Your own reports stay private'].map(
                (t) => (
                  <li key={t} className="flex items-center gap-2 text-sm text-ink-500">
                    <CheckCircle2 size={15} className="text-emerald-500" />
                    {t}
                  </li>
                )
              )}
            </ul>
          </div>

          <div className="relative lg:pl-4">
            <div
              className="absolute -inset-6 -z-10 rounded-[28px] opacity-70 blur-2xl"
              style={{
                background:
                  'radial-gradient(closest-side, rgba(99,102,241,.22), transparent 75%)',
              }}
              aria-hidden="true"
            />
            <MockReport />
          </div>
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section id="features" className="border-t border-ink-200/70 bg-ink-50/60">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
              Features
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
              A detection score is easy. Evidence is useful.
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-600">
              VeriWrite turns model output into something a reviewer can actually act on —
              structured signals, quoted excerpts, and a confidence level stated honestly.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="card card-hover p-6 animate-fade-up"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <f.icon size={21} strokeWidth={2} />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-ink-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how" className="border-t border-ink-200/70 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
                How It Works
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
                Three steps from submission to evidence
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-ink-600">
                The pipeline is deliberately transparent: text is extracted, cleaned, split into
                sections, analysed, validated, and only then stored as a report.
              </p>

              <Link
                to="/analyze"
                className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition hover:text-brand-700"
              >
                Try it with your own assignment
                <ChevronRight size={15} />
              </Link>
            </div>

            <ol className="relative space-y-8">
              <span
                className="absolute left-[19px] top-3 bottom-3 w-px bg-gradient-to-b from-brand-300 via-ink-200 to-transparent"
                aria-hidden="true"
              />
              {STEPS.map((s, i) => (
                <li key={s.n} className="relative flex gap-5 animate-fade-up" style={{ animationDelay: `${i * 90}ms` }}>
                  <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-brand-200 bg-white text-sm font-bold text-brand-600 shadow-sm">
                    {s.n}
                  </span>
                  <div className="pt-1.5">
                    <h3 className="text-[15px] font-semibold text-ink-900">{s.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ---------------- Integration teaser ---------------- */}
      <section id="integration" className="border-t border-ink-200/70 bg-ink-950">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Add VeriWrite to your own system
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-300">
              One authenticated endpoint returns a structured report. Copy the request, paste it
              into your backend, and you are done.
            </p>
          </div>
          <Link to={isAuthenticated ? '/integration' : '/signup'} className="btn-primary shrink-0 !px-5 !py-3">
            View integration docs
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-ink-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:px-8">
          <div>
            <Logo size="sm" showTagline />
            <p className="mt-3 text-xs leading-relaxed text-ink-400">
              AI-detection is probabilistic. VeriWrite reports writing patterns and evidence —
              never a definitive verdict on a student.
            </p>
          </div>

          <nav className="flex flex-wrap gap-6" aria-label="Footer">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
              >
                {n.label}
              </a>
            ))}
            <Link
              to="/login"
              className="text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
            >
              Login
            </Link>
          </nav>
        </div>

        <div className="border-t border-ink-100">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-ink-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>© {new Date().getFullYear()} VeriWrite AI. All rights reserved.</p>
            <p>Built for explainable academic integrity.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
