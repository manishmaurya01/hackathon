import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  Gauge,
  Layers,
  Crosshair,
  Lightbulb,
  FileText,
  Quote,
  ChevronRight,
  Search,
  Globe,
  ExternalLink,
  BarChart2,
  Type,
} from 'lucide-react';
import { getReport } from '../services/analysis.service.js';
import { useAsync } from '../hooks/useAsync.js';
import { ReportDetailSkeleton } from '../components/Loading.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import { formatDateTime } from '../utils/format.js';
import {
  likelihoodTone,
  statusTone,
  confidenceTone,
  severityTone,
  signalTypeLabel,
  similarityTone,
  matchTypeLabel,
  matchTypeTone,
} from '../utils/report.js';

function SummaryStat({ label, value, icon: Icon, tone = 'text-ink-900', sub }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-400">{label}</p>
        {Icon && <Icon size={15} className="text-ink-300" />}
      </div>
      <p className={`mt-2.5 text-xl font-bold tracking-tight ${tone}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-500">{sub}</p>}
    </div>
  );
}

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => getReport(id), [id]);

  const report = data?.report;
  const [activeEvidence, setActiveEvidence] = useState(null);
  const sectionRefs = useRef({});

  // Group evidence by section so the explorer and the text stay in sync.
  const evidenceBySection = useMemo(() => {
    if (!report?.evidence) return [];
    const map = new Map();
    for (const e of report.evidence) {
      if (!map.has(e.section)) map.set(e.section, []);
      map.get(e.section).push(e);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([section, items]) => ({ section, items }));
  }, [report]);

  useEffect(() => {
    if (activeEvidence == null) return;
    const el = sectionRefs.current[activeEvidence];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const t = setTimeout(() => {
        el.classList.add('ring-2', 'ring-brand-500', 'ring-offset-2');
      }, 350);
      const t2 = setTimeout(() => {
        el.classList.remove('ring-2', 'ring-brand-500', 'ring-offset-2');
      }, 2200);
      return () => {
        clearTimeout(t);
        clearTimeout(t2);
      };
    }
    return undefined;
  }, [activeEvidence]);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <ReportDetailSkeleton />
      </div>
    );
  }

  if (error) {
    if (error.statusCode === 404) {
      return (
        <EmptyState
          variant="notfound"
          title="Report not found"
          description="This report doesn't exist, or it belongs to a different account."
          actionLabel="Back to reports"
          onAction={() => navigate('/reports')}
        />
      );
    }
    return <ErrorAlert error={error} title="Couldn't load this report" onRetry={reload} />;
  }

  if (!report) return null;

  const isFailed = report.status === 'failed';

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link
          to="/reports"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink-500 transition hover:text-ink-900"
        >
          <ArrowLeft size={15} />
          Back to reports
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-brand-600">
              Authenticity Report
            </p>
            <h1 className="mt-1.5 max-w-2xl break-words text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
              {report.fileName || 'Pasted text'}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
              <span>Generated {formatDateTime(report.createdAt)}</span>
              <span aria-hidden="true">·</span>
              <span>
                {report.inputType === 'file' ? 'File upload' : 'Pasted text'}
                {report.wordCount ? ` · ${report.wordCount.toLocaleString()} words` : ''}
              </span>
              <span aria-hidden="true">·</span>
              <span>{report.sections?.length || 0} sections</span>
            </p>
          </div>

          <Link to="/analyze" className="btn-secondary shrink-0">
            Analyze another
          </Link>
        </div>
      </div>

      {/* Failure state — the record exists, but the analysis did not complete. */}
      {isFailed ? (
        <div className="space-y-5">
          <EmptyState
            variant="error"
            title="This analysis did not complete"
            description={
              report.error ||
              'The analysis failed before a report could be generated. Your assignment text was saved, but no findings are available.'
            }
            actionLabel="Try again"
            onAction={() => navigate('/analyze')}
            secondaryLabel="Back to reports"
            onSecondary={() => navigate('/reports')}
          />
          <div className="card p-5">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-400">
              Submitted content
            </p>
            <p className="mt-2 text-sm text-ink-600">
              {report.wordCount?.toLocaleString()} words · {report.sections?.length || 0} sections
            </p>
            <p className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-ink-50 p-4 text-sm leading-relaxed text-ink-600 thin-scroll">
              {report.originalText?.slice(0, 2000)}
              {(report.originalText?.length || 0) > 2000 ? '…' : ''}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary strip */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card p-5">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-400">
                Overall Status
              </p>
              <span className={`mt-2.5 inline-flex text-sm ${statusTone(report.overallStatus)}`}>
                {report.overallStatus}
              </span>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-400">
                  AI-likelihood
                </p>
                <Gauge size={15} className="text-ink-300" />
              </div>
              <span className={`mt-2.5 inline-flex text-sm ${likelihoodTone(report.aiLikelihood)}`}>
                {report.aiLikelihood}
              </span>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-400">
                  Confidence
                </p>
                <Crosshair size={15} className="text-ink-300" />
              </div>
              <span className={`mt-2.5 inline-flex text-sm ${confidenceTone(report.confidence)}`}>
                {report.confidence}
              </span>
            </div>

            <SummaryStat
              label="Sections Flagged"
              value={report.sectionsFlagged ?? 0}
              sub={`of ${report.sections?.length || 0} sections reviewed`}
              icon={Layers}
            />
          </div>

          {/* Overall Summary Strip - AI + Plagiarism */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="card p-5">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-400">
                Overall Status
              </p>
              <span className={`mt-2.5 inline-flex text-sm ${statusTone(report.overallStatus)}`}>
                {report.overallStatus}
              </span>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-400">
                  AI-Likelihood
                </p>
                <Gauge size={15} className="text-ink-300" />
              </div>
              <span className={`mt-2.5 inline-flex text-sm ${likelihoodTone(report.aiLikelihood)}`}>
                {report.aiLikelihood}
              </span>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-400">
                  Confidence
                </p>
                <Crosshair size={15} className="text-ink-300" />
              </div>
              <span className={`mt-2.5 inline-flex text-sm ${confidenceTone(report.confidence)}`}>
                {report.confidence}
              </span>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-400">
                  Plagiarism Similarity
                </p>
                <Search size={15} className="text-ink-300" />
              </div>
              <span className={`mt-2.5 inline-flex text-sm ${similarityTone(report.plagiarismCategory)}`}>
                {report.plagiarismScore}%
              </span>
              <p className="mt-1 text-xs text-ink-500">{report.plagiarismCategory}</p>
            </div>

            <SummaryStat
              label="Sections Flagged"
              value={report.sectionsFlagged ?? 0}
              sub={`of ${report.sections?.length || 0} sections reviewed`}
              icon={Layers}
            />
          </div>

          {/* AI Writing Analysis */}
          <section className="card p-6">
            <div className="flex items-center gap-2">
              <Gauge size={16} className="text-brand-600" />
              <h2 className="text-[15px] font-semibold text-ink-900">AI Writing Analysis</h2>
            </div>

            {report.aiSummary && (
              <p className="mt-3 text-[15px] leading-relaxed text-ink-700">{report.aiSummary}</p>
            )}

            {report.aiConfidence && (
              <p className="mt-3 text-sm text-ink-500">
                <span className="font-medium">Confidence: </span>{report.aiConfidence}
              </p>
            )}

            {/* AI Signals */}
            <div className="mt-5">
              <h3 className="text-[13px] font-semibold text-ink-700">Signals Detected</h3>
              {report.signals?.length ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {report.signals.map((s, i) => {
                    const tone = severityTone(s.severity);
                    return (
                      <article
                        key={`${s.label}-${i}`}
                        className="relative overflow-hidden rounded-xl border border-ink-200 bg-white p-4 transition hover:border-ink-300 hover:shadow-card"
                      >
                        <span
                          className={`absolute inset-y-0 left-0 w-1 ${tone.bar}`}
                          aria-hidden="true"
                        />
                        <div className="pl-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                            {signalTypeLabel(s.type)}
                          </p>
                          <p className="mt-1.5 text-[15px] font-semibold text-ink-900">{s.label}</p>
                          <span className={`mt-2.5 inline-flex text-xs ${tone.badge}`}>
                            {tone.label}
                          </span>
                          <p className="mt-2.5 text-[13px] leading-relaxed text-ink-500">
                            {s.explanation}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-700">
                  No strong AI writing-pattern signals were found in this submission.
                </p>
              )}
            </div>

            {report.recommendations?.length > 0 && (
              <div className="mt-5 rounded-lg border border-ink-100 bg-ink-50/70 p-4">
                <div className="flex items-center gap-2">
                  <Lightbulb size={14} className="text-amber-500" />
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-500">
                    Recommendations
                  </p>
                </div>
                <ul className="mt-2.5 space-y-1.5">
                  {report.recommendations.map((r, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink-600">
                      <ChevronRight size={14} className="mt-1 shrink-0 text-ink-400" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-5 border-t border-ink-100 pt-4 text-xs leading-relaxed text-ink-400">
              AI-detection is probabilistic. This analysis describes observed writing patterns and
              the evidence behind them — it is not a determination of misconduct.
              {report.model ? ` Model: ${report.model}.` : ''}
            </p>
          </section>

          {/* Plagiarism Analysis */}
          {(report.sourcesFound ?? 0) > 0 || (report.plagiarismScore ?? 0) > 0 ? (
            <section className="card p-6">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-amber-600" />
                <h2 className="text-[15px] font-semibold text-ink-900">Plagiarism / Similarity Analysis</h2>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryStat
                  label="Similarity Score"
                  value={`${report.plagiarismScore}%`}
                  tone={similarityTone(report.plagiarismCategory)}
                  sub={report.plagiarismCategory}
                  icon={Search}
                />
                <SummaryStat
                  label="Sources Found"
                  value={report.sourcesFound ?? 0}
                  sub="unique sources"
                  icon={Globe}
                />
                <SummaryStat
                  label="Sections Matched"
                  value={report.matchedSections ?? 0}
                  sub={report.sections?.length ? `of ${report.sections.length}` : ''}
                  icon={FileText}
                />
                <SummaryStat
                  label="Highest Match"
                  value={`${report.highestMatch ?? 0}%`}
                  tone={report.highestMatch > 80 ? 'text-red-600' : report.highestMatch > 50 ? 'text-amber-600' : 'text-ink-900'}
                  icon={BarChart2}
                />
              </div>

              {/* Detected Sources */}
              {report.plagiarismSources?.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-[13px] font-semibold text-ink-700">Detected Sources</h3>
                  <div className="mt-3 space-y-3">
                    {report.plagiarismSources.map((source) => (
                      <article
                        key={source.url}
                        className="rounded-xl border border-ink-200 bg-white p-4 transition hover:border-ink-300 hover:shadow-card"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-ink-900 truncate">{source.title}</p>
                            <p className="mt-1 text-xs text-ink-500">
                              {source.domain} · {source.matchCount} match{source.matchCount !== 1 ? 'es' : ''} · Max similarity: {source.maxSimilarity}%
                            </p>
                          </div>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition hover:text-brand-700 shrink-0"
                          >
                            <ExternalLink size={14} />
                            Open Source
                          </a>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence Details */}
              {report.plagiarismEvidence?.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-[13px] font-semibold text-ink-700">Evidence Details</h3>
                  <div className="mt-3 space-y-4">
                    {report.plagiarismEvidence.map((evidence, i) => (
                      <article
                        key={`${evidence.sourceUrl}-${i}`}
                        className="rounded-xl border border-ink-200 bg-white p-4 transition hover:border-ink-300 hover:shadow-card"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                          <span className={`${matchTypeTone(evidence.matchType)} !text-[10px]`}>
                            {matchTypeLabel(evidence.matchType)}
                          </span>
                          <span className="text-xs font-medium text-ink-400">
                            {evidence.similarity}% similarity
                          </span>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                              Student Text (Section {evidence.section})
                            </p>
                            <p className="mt-2 text-[13.5px] italic leading-relaxed text-ink-800 bg-amber-50/50 rounded p-3">
                              "{evidence.studentText}"
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                              Source Text
                            </p>
                            <p className="mt-2 text-[13.5px] italic leading-relaxed text-ink-800 bg-blue-50/50 rounded p-3">
                              "{evidence.sourceText}"
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-4">
                          <a
                            href={evidence.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 transition hover:text-brand-700"
                          >
                            <ExternalLink size={13} />
                            {evidence.sourceTitle}
                          </a>
                          <span className="text-xs text-ink-500">({evidence.sourceDomain})</span>
                        </div>

                        <p className="mt-3 text-[13px] leading-relaxed text-ink-600">
                          <span className="font-medium text-ink-400">Why this was flagged: </span>
                          {evidence.explanation}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              <p className="mt-5 border-t border-ink-100 pt-4 text-xs leading-relaxed text-ink-400">
                Similarity detection identifies text overlap with public sources. This is not a legal
                determination of plagiarism — review each match in context.
              </p>
            </section>
          ) : (
            <section className="card p-6">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-emerald-600" />
                <h2 className="text-[15px] font-semibold text-ink-900">Plagiarism / Similarity Analysis</h2>
              </div>
              <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-4 text-center text-sm leading-relaxed text-emerald-700">
                No significant text similarity detected with public sources.
              </p>
            </section>
          )}

          {/* Writing Style Analysis */}
          {report.styleAnalysis && Object.keys(report.styleAnalysis).length > 0 ? (
            <section className="card p-6">
              <div className="flex items-center gap-2">
                <Type size={16} className="text-brand-600" />
                <h2 className="text-[15px] font-semibold text-ink-900">Writing Style Analysis</h2>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryStat
                  label="Word Count"
                  value={report.styleAnalysis.wordCount?.toLocaleString() ?? '—'}
                  icon={FileText}
                />
                <SummaryStat
                  label="Sentences"
                  value={report.styleAnalysis.sentenceCount ?? '—'}
                  icon={Type}
                />
                <SummaryStat
                  label="Avg Sentence Length"
                  value={report.styleAnalysis.averageSentenceLength ?? '—'}
                  icon={BarChart2}
                />
                <SummaryStat
                  label="Vocabulary Diversity"
                  value={`${(report.styleAnalysis.vocabularyDiversity ?? 0).toFixed(1)}%`}
                  sub="Type-token ratio"
                  icon={BarChart2}
                />
              </div>

              {report.styleAnalysis.repeatedPhrases?.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-[13px] font-semibold text-ink-700">Repeated Phrases</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {report.styleAnalysis.repeatedPhrases.slice(0, 8).map((rp, i) => (
                      <span key={i} className="badge-info !text-[11px]">
                        "{rp.phrase}" × {rp.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-ink-200 bg-ink-50/50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                    Longest Sentence
                  </p>
                  <p className="mt-2 text-sm italic leading-relaxed text-ink-700">
                    "{report.styleAnalysis.longestSentence}"
                  </p>
                </div>
                <div className="rounded-lg border border-ink-200 bg-ink-50/50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                    Shortest Sentence
                  </p>
                  <p className="mt-2 text-sm italic leading-relaxed text-ink-700">
                    "{report.styleAnalysis.shortestSentence}"
                  </p>
                </div>
              </div>

              <p className="mt-5 border-t border-ink-100 pt-4 text-xs leading-relaxed text-ink-400">
                Style metrics are computed deterministically from the submitted text.
              </p>
            </section>
          ) : null}

          {/* AI Evidence explorer */}
          <section className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
            {/* Assignment text */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-ink-200/70 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-ink-400" />
                  <h2 className="text-[15px] font-semibold text-ink-900">Assignment</h2>
                </div>
                <span className="text-xs text-ink-400">{report.sections?.length || 0} sections</span>
              </div>

              <div className="max-h-[560px] space-y-4 overflow-y-auto p-5 thin-scroll">
                {report.sections?.map((sec) => {
                  const flagged = evidenceBySection.some((g) => g.section === sec.index);
                  return (
                    <div
                      key={sec.index}
                      ref={(el) => {
                        sectionRefs.current[sec.index] = el;
                      }}
                      className={`scroll-mt-24 rounded-lg border p-4 transition-all duration-500 ${flagged
                          ? 'border-brand-200 bg-brand-50/40'
                          : 'border-ink-100 bg-white'
                        }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold tracking-wide text-brand-600">
                          SECTION {String(sec.index).padStart(2, '0')}
                        </span>
                        {flagged && (
                          <span className="badge-warn !py-0.5 !text-[10px]">
                            {evidenceBySection.find((g) => g.section === sec.index)?.items.length}{' '}
                            flagged
                          </span>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink-700">
                        {highlightEvidence(sec, evidenceBySection)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Evidence panel */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-ink-200/70 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <Quote size={15} className="text-ink-400" />
                  <h2 className="text-[15px] font-semibold text-ink-900">Evidence Explorer</h2>
                </div>
                <span className="text-xs text-ink-400">
                  {report.evidence?.length || 0} excerpt
                  {(report.evidence?.length || 0) === 1 ? '' : 's'}
                </span>
              </div>

              <div className="max-h-[560px] overflow-y-auto p-5 thin-scroll">
                {evidenceBySection.length === 0 ? (
                  <p className="rounded-lg bg-ink-50 px-4 py-6 text-center text-sm text-ink-500">
                    No specific excerpts were flagged for this submission.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {evidenceBySection.map((group) => (
                      <div key={group.section}>
                        <p className="mb-2 font-mono text-[11px] font-bold tracking-wide text-brand-600">
                          SECTION {String(group.section).padStart(2, '0')}
                        </p>

                        <div className="space-y-3">
                          {group.items.map((e, i) => {
                            const tone = confidenceTone(e.confidence);
                            const isActive = activeEvidence === group.section && i === 0;
                            return (
                              <article
                                key={`${e.text}-${i}`}
                                onClick={() => setActiveEvidence(e.section)}
                                className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 hover:shadow-card ${isActive
                                    ? 'border-brand-400 bg-brand-50/60'
                                    : 'border-ink-200 bg-white'
                                  }`}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(ev) => {
                                  if (ev.key === 'Enter' || ev.key === ' ') {
                                    ev.preventDefault();
                                    setActiveEvidence(e.section);
                                  }
                                }}
                                aria-label={`Jump to section ${e.section} in the assignment`}
                              >
                                <p className="text-[13.5px] italic leading-relaxed text-ink-800">
                                  “{e.text}”
                                </p>

                                <div className="mt-3 border-t border-ink-100 pt-3">
                                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                                    Why was this flagged?
                                  </p>
                                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-600">
                                    {e.reason}
                                  </p>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-medium text-ink-400">
                                    Confidence:
                                  </span>
                                  <span className={`${tone} !py-0.5 !text-[11px]`}>
                                    {e.confidence}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      setActiveEvidence(e.section);
                                    }}
                                    className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
                                  >
                                    Jump to section
                                    <ChevronRight size={13} />
                                  </button>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Full submitted text */}
          {report.originalText && (
            <details className="card group p-5">
              <summary className="cursor-pointer list-none text-sm font-semibold text-ink-700 transition hover:text-ink-950">
                <span className="inline-flex items-center gap-1.5">
                  View full submitted text
                  <ChevronRight
                    size={14}
                    className="transition-transform group-open:rotate-90"
                  />
                </span>
              </summary>
              <p className="mt-4 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg bg-ink-50 p-4 text-sm leading-relaxed text-ink-600 thin-scroll">
                {report.originalText}
              </p>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Emphasise quoted excerpts inside the section text so the reviewer sees
 * exactly what the model referred to.
 */
function highlightEvidence(sec, groups) {
  const group = groups.find((g) => g.section === sec.index);
  if (!group) return sec.text;

  const quotes = group.items.map((i) => i.text).filter((t) => t && t.length >= 12);
  if (!quotes.length) return sec.text;

  // Longest first so partial overlaps don't corrupt the markup.
  const sorted = [...quotes].sort((a, b) => b.length - a.length);
  let html = escapeHtml(sec.text);

  for (const q of sorted) {
    const escaped = escapeHtml(q);
    if (!escaped || !html.includes(escaped)) continue;
    html = html.replace(
      escaped,
      `<mark class="rounded bg-amber-100 px-0.5 text-ink-900 ring-1 ring-amber-300/70">${escaped}</mark>`
    );
  }

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}