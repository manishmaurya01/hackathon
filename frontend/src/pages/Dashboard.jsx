import { Link, useNavigate } from 'react-router-dom';
import {
  FileBarChart2,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  ChevronRight,
  Search,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { getStats } from '../services/analysis.service.js';
import { useAsync } from '../hooks/useAsync.js';
import { StatSkeleton } from '../components/Loading.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import { greeting, firstName, timeAgo } from '../utils/format.js';
import { likelihoodTone, statusTone, similarityTone } from '../utils/report.js';

const CARD_ICONS = [FileBarChart2, CalendarDays, CheckCircle2, AlertTriangle, Search];
const CARD_LABELS = ['Total Reports', 'This Month', 'Analyses Completed', 'High Similarity', 'Flagged Reports'];

function StatCard({ label, value, index, loading }) {
  const Icon = CARD_ICONS[index];
  const accent =
    index === 3
      ? 'text-red-600 bg-red-50'
      : index === 2
        ? 'text-emerald-600 bg-emerald-50'
        : index === 4
          ? 'text-amber-600 bg-amber-50'
          : 'text-brand-600 bg-brand-50';

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium text-ink-500">{label}</p>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${accent}`}>
          <Icon size={16} strokeWidth={2} />
        </span>
      </div>

      {loading ? (
        <div className="skeleton mt-3 h-9 w-16" />
      ) : (
        <p className="mt-2 text-3xl font-bold tracking-tight text-ink-950">{value ?? 0}</p>
      )}
    </div>
  );
}

function RecentRow({ report }) {
  const to = report.status === 'processing' ? '#' : `/report/${report.id}`;
  const tone =
    report.status === 'failed'
      ? 'badge-bad'
      : report.status === 'processing'
        ? 'badge-neutral'
        : statusTone(report.overallStatus);

  return (
    <Link
      to={to}
      className="group flex items-center gap-4 border-b border-ink-100 px-5 py-3.5 transition-colors last:border-0 hover:bg-ink-50/70"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-500 transition group-hover:bg-brand-50 group-hover:text-brand-600">
        <FileBarChart2 size={16} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-900">
          {report.fileName || 'Pasted text'}
        </p>
        <p className="mt-0.5 text-xs text-ink-500">
          {timeAgo(report.createdAt)} · {report.sectionsFlagged ?? 0} section
          {(report.sectionsFlagged ?? 0) === 1 ? '' : 's'} flagged
        </p>
      </div>

      <span className={`hidden shrink-0 sm:inline-flex ${tone}`}>
        {report.status === 'failed'
          ? 'Failed'
          : report.status === 'processing'
            ? 'Processing'
            : report.overallStatus}
      </span>

      {report.aiLikelihood && report.status === 'completed' && (
        <span className={`hidden shrink-0 md:inline-flex ${likelihoodTone(report.aiLikelihood)}`}>
          {report.aiLikelihood}
        </span>
      )}

      {report.plagiarismScore !== undefined && report.status === 'completed' && (
        <span className={`hidden shrink-0 md:inline-flex ${similarityTone(report.plagiarismCategory)}`}>
          {report.plagiarismScore}%
        </span>
      )}

      <ChevronRight
        size={16}
        className="shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-ink-600"
      />
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => getStats(), []);

  const stats = data?.stats;
  const recent = data?.recentReports || [];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Greeting */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-ink-500">{greeting()},</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
            {firstName(user?.name)}
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-600">
            Analyze an assignment and get an explainable authenticity report.
          </p>
        </div>

        <Link to="/analyze" className="btn-primary shrink-0 !px-4 !py-2.5">
          <Plus size={16} />
          New Analysis
        </Link>
      </div>

      {error && (
        <ErrorAlert
          error={error}
          title="Couldn't load your statistics"
          onRetry={reload}
        />
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {loading
          ? CARD_LABELS.map((l) => <StatSkeleton key={l} />)
          : CARD_LABELS.map((label, i) => (
              <StatCard
                key={label}
                label={label}
                index={i}
                value={
                  stats
                    ? [
                        stats.totalReports,
                        stats.thisMonth,
                        stats.analysesCompleted,
                        stats.highSimilarityReports,
                        stats.flaggedReports,
                      ][i]
                    : 0
                }
              />
            ))}
      </div>

      {/* Recent reports */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-200/70 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-ink-900">Recent reports</h2>
            <p className="mt-0.5 text-xs text-ink-500">Your five most recent analyses</p>
          </div>
          <Link
            to="/reports"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 transition hover:text-brand-700"
          >
            View all
            <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="skeleton h-9 w-9 rounded-lg" />
                <div className="flex-1">
                  <div className="skeleton h-3.5 w-48" />
                  <div className="skeleton mt-2 h-3 w-32" />
                </div>
                <div className="skeleton h-6 w-24 rounded-full" />
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="p-5">
            <EmptyState
              variant="empty"
              title="No reports yet"
              description="Upload an assignment or paste some text to generate your first explainable authenticity report."
              actionLabel="Start your first analysis"
              onAction={() => navigate('/analyze')}
              className="!border-0 !shadow-none"
            />
          </div>
        ) : (
          <div>
            {recent.map((r) => (
              <RecentRow key={r.id} report={r} />
            ))}
          </div>
        )}
      </section>

      {/* Quick tips */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            t: 'Explainable, not absolute',
            b: 'Every report pairs an AI-likelihood with quoted evidence so you can verify the call yourself.',
          },
          {
            t: 'Section-level review',
            b: 'Findings map to numbered sections — click through to the exact excerpt that was flagged.',
          },
          {
            t: 'Confidence stated honestly',
            b: 'We report how sure the analysis is rather than a percentage that implies false precision.',
          },
        ].map((c) => (
          <div key={c.t} className="card p-5">
            <p className="text-sm font-semibold text-ink-900">{c.t}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">{c.b}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
