import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Trash2, Eye, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { listReports, deleteReport } from '../services/analysis.service.js';
import { useAsync, useDebounced } from '../hooks/useAsync.js';
import { useToast } from '../hooks/useToast.jsx';
import { ReportListSkeleton } from '../components/Loading.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import { formatDate } from '../utils/format.js';
import { likelihoodTone, statusTone, actionLabel, similarityTone } from '../utils/report.js';

const PAGE_SIZE = 10;

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
  { id: 'high-similarity', label: 'High Similarity' },
  { id: 'ai-signals', label: 'AI Signals' },
];

export default function Reports() {
  const toast = useToast();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [confirmId, setConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const debouncedQuery = useDebounced(query, 300);

  const { data, loading, error, reload } = useAsync(
    () => listReports(),
    []
  );

  const all = data?.reports || [];

  const filtered = all.filter((r) => {
    if (status && r.status !== status) return false;
    if (!debouncedQuery.trim()) return true;
    const n = debouncedQuery.trim().toLowerCase();
    return (
      (r.fileName || '').toLowerCase().includes(n) ||
      (r.overallStatus || '').toLowerCase().includes(n) ||
      (r.aiLikelihood || '').toLowerCase().includes(n) ||
      (r.inputType || '').toLowerCase().includes(n) ||
      (r.summary || '').toLowerCase().includes(n)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function confirmDelete() {
    if (!confirmId) return;
    setDeleting(true);
    try {
      await deleteReport(confirmId);
      toast.success('Report deleted.');
      setConfirmId(null);
      reload();
    } catch (err) {
      toast.error(err.message || 'Could not delete the report.');
      setConfirmId(null);
    } finally {
      setDeleting(false);
    }
  }

  const hasFilters = Boolean(debouncedQuery.trim() || status);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">Reports</h1>
          <p className="mt-1.5 text-[15px] text-ink-600">
            Every analysis you&apos;ve run, stored in your account only.
          </p>
        </div>
        <Link to="/analyze" className="btn-primary shrink-0">
          New Analysis
        </Link>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <input
            type="search"
            className="input pl-10"
            placeholder="Search by name, status or AI signal…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            aria-label="Search reports"
          />
        </div>

        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setStatus(f.id);
                setPage(1);
              }}
              className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition ${
                status === f.id
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:bg-ink-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorAlert error={error} title="Couldn't load reports" onRetry={reload} />}

      {loading ? (
        <ReportListSkeleton rows={5} />
      ) : all.length === 0 ? (
        <EmptyState
          variant="empty"
          title="No reports yet"
          description="Once you analyze an assignment, it will appear here with its full explainable report."
          actionLabel="Analyze an assignment"
          onAction={() => navigate('/analyze')}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          variant="notfound"
          title="No matching reports"
          description={`Nothing matched ${hasFilters ? `“${debouncedQuery || status}”` : 'your filters'}. Try a different search term.`}
          actionLabel="Clear filters"
          onAction={() => {
            setQuery('');
            setStatus('');
            setPage(1);
          }}
          secondaryLabel="View all reports"
          onSecondary={() => {
            setQuery('');
            setStatus('');
            setPage(1);
          }}
        />
      ) : (
        <>
          {/* Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto thin-scroll">
              <table className="w-full min-w-[820px] text-left">
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-50/70">
                    {['Assignment', 'Date', 'Status', 'AI Signal', 'Plagiarism', 'Sections Flagged', 'Action'].map(
                      (h) => (
                        <th
                          key={h}
                          scope="col"
                          className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-500"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-ink-100 transition-colors last:border-0 hover:bg-ink-50/60"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-500">
                            <FileText size={15} />
                          </span>
                          <div className="min-w-0">
                            <p className="max-w-[240px] truncate text-sm font-semibold text-ink-900">
                              {r.fileName || 'Pasted text'}
                            </p>
                            <p className="text-xs capitalize text-ink-400">
                              {r.inputType === 'file' ? 'File upload' : 'Pasted text'}
                              {r.wordCount ? ` · ${r.wordCount.toLocaleString()} words` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-ink-600">
                        {formatDate(r.createdAt)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={
                            r.status === 'failed'
                              ? 'badge-bad'
                              : r.status === 'processing'
                                ? 'badge-neutral'
                                : statusTone(r.overallStatus)
                          }
                        >
                          {r.status === 'failed'
                            ? 'Failed'
                            : r.status === 'processing'
                              ? 'Processing'
                              : r.overallStatus}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {r.aiLikelihood && r.status === 'completed' ? (
                          <span className={likelihoodTone(r.aiLikelihood)}>{r.aiLikelihood}</span>
                        ) : (
                          <span className="text-sm text-ink-300">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {r.plagiarismScore !== undefined && r.status === 'completed' ? (
                          <span className={similarityTone(r.plagiarismCategory)}>{r.plagiarismScore}%</span>
                        ) : (
                          <span className="text-sm text-ink-300">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-ink-800">
                          {r.status === 'completed' ? r.sectionsFlagged ?? 0 : '—'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/report/${r.id}`}
                            className="btn-secondary !px-3 !py-1.5 !text-xs"
                          >
                            <Eye size={13} />
                            {actionLabel(r)}
                          </Link>
                          <button
                            type="button"
                            onClick={() => setConfirmId(r.id)}
                            className="rounded-md p-2 text-ink-400 transition hover:bg-red-50 hover:text-red-600"
                            aria-label={`Delete ${r.fileName || 'pasted text report'}`}
                            title="Delete report"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-500">
                Showing{' '}
                <span className="font-semibold text-ink-800">
                  {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)}
                </span>{' '}
                of <span className="font-semibold text-ink-800">{filtered.length}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary !px-3 !py-1.5 !text-sm disabled:opacity-40"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={15} />
                  Prev
                </button>
                <span className="px-2 text-sm text-ink-500">
                  {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  className="btn-secondary !px-3 !py-1.5 !text-sm disabled:opacity-40"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation */}
      {confirmId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/40 p-4 backdrop-blur-sm animate-fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="w-full max-w-sm rounded-xl border border-ink-200 bg-white p-6 shadow-pop animate-scale-in"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-600">
              <Trash2 size={18} />
            </span>
            <h2 id="delete-title" className="mt-4 text-lg font-semibold text-ink-900">
              Delete this report?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              The report and its evidence will be permanently removed. This can&apos;t be undone.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => setConfirmId(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn flex-1 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
