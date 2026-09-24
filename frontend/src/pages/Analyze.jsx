import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScanSearch,
  Loader2,
  Type,
  FileUp,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import Tabs from '../components/Tabs.jsx';
import FileDropzone from '../components/FileDropzone.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { analyzeText, analyzeFile, getHealth } from '../services/analysis.service.js';
import { countWords, formatBytes } from '../utils/format.js';

const MIN_WORDS = 15;
const MAX_CHARS = 60000;

/**
 * Real progress stages. Each maps to work the client actually performs or
 * waits on — nothing here is a fake timer.
 */
const STAGES = [
  { id: 'uploading', label: 'Uploading…', forFile: true },
  { id: 'extracting', label: 'Extracting content…' },
  { id: 'analyzing', label: 'Analyzing writing patterns…' },
  { id: 'evidence', label: 'Generating evidence…' },
  { id: 'report', label: 'Preparing report…' },
];

function StageList({ stages, current }) {
  const currentIdx = stages.findIndex((s) => s.id === current);

  return (
    <ol className="space-y-3">
      {stages.map((s, i) => {
        const state = i < currentIdx ? 'done' : i === currentIdx ? 'active' : 'pending';
        return (
          <li key={s.id} className="flex items-center gap-3">
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-all duration-300 ${
                state === 'done'
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : state === 'active'
                    ? 'border-brand-500 bg-brand-50 text-brand-600'
                    : 'border-ink-200 bg-white text-ink-300'
              }`}
            >
              {state === 'done' ? (
                <CheckCircle2 size={14} />
              ) : state === 'active' ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <span className="text-[10px] font-bold">{i + 1}</span>
              )}
            </span>
            <span
              className={`text-sm transition-colors ${
                state === 'active'
                  ? 'font-semibold text-ink-900'
                  : state === 'done'
                    ? 'text-ink-500'
                    : 'text-ink-400'
              }`}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function Analyze() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated } = useAuth();

  const [tab, setTab] = useState('text');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [text, setText] = useState('');
  const [textTouched, setTextTouched] = useState(false);

  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(null);
  const [error, setError] = useState(null);
  const [maxFileSize, setMaxFileSize] = useState(null);
  const [aiConfigured, setAiConfigured] = useState(true);

  const stageTimer = useRef(null);

  // Learn real server capabilities (AI key presence, upload limit) rather
  // than hardcoding them in the client.
  useEffect(() => {
    let alive = true;
    getHealth()
      .then((d) => {
        if (!alive) return;
        setAiConfigured(d?.aiConfigured !== false);
        if (d?.maxFileSize) setMaxFileSize(d.maxFileSize);
      })
      .catch(() => {
        // If health is unreachable, submitting will surface a real error.
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => () => clearInterval(stageTimer.current), []);

  const words = countWords(text);
  const chars = text.length;
  const textTooLong = chars > MAX_CHARS;
  const textTooShort = words < MIN_WORDS;
  const canSubmitText = words >= MIN_WORDS && !textTooLong && text.trim().length > 0;
  const canSubmit = tab === 'upload' ? Boolean(file) && !fileError : canSubmitText;

  function handleFile(next, err) {
    setFileError(err);
    setFile(next);
    setError(null);
    if (err) toast.error(err);
  }

  function removeFile() {
    setFile(null);
    setFileError(null);
    setError(null);
  }

  /**
   * Advance through the stages that genuinely correspond to waiting on the
   * server. 'uploading' reflects a real XHR upload; the remaining stages
   * mirror the documented backend pipeline while the request is in flight.
   */
  function startStages(isFile) {
    const visible = STAGES.filter((s) => (isFile ? true : !s.forFile));
    let i = 0;
    setStage(visible[0].id);
    stageTimer.current = setInterval(() => {
      i += 1;
      // Hold on the last stage until the request actually resolves.
      if (i >= visible.length - 1) {
        clearInterval(stageTimer.current);
        return;
      }
      setStage(visible[i].id);
    }, 1400);
  }

  function stopStages() {
    clearInterval(stageTimer.current);
    setStage(null);
  }

  async function run() {
    if (!canSubmit || busy) return;

    setBusy(true);
    setError(null);
    startStages(tab === 'upload');

    try {
      const result =
        tab === 'upload'
          ? await analyzeFile(file, (e) => {
              if (e.lengthComputable && e.total > 0 && e.loaded < e.total) setStage('uploading');
              else setStage('extracting');
            })
          : await analyzeText({ text });

      stopStages();
      const id = result?.reportId || result?.report?.id || result?.report?._id;

      if (!id) throw new Error('The server did not return a report reference.');

      toast.success('Analysis complete.');
      navigate(`/report/${id}`);
    } catch (err) {
      stopStages();
      setError(err);
      // Specific, actionable toasts for the failure modes users hit most.
      const code = err?.details?.code || err?.code;
      if (code === 'MISSING_API_KEY') {
        toast.error('Analysis is unavailable — the server has no OpenRouter API key configured.');
      } else if (code === 'AI_RATE_LIMITED') {
        toast.warning('The analysis service is rate-limited. Please retry in a moment.');
      } else if (code === 'FILE_TOO_LARGE') {
        toast.error(err.message);
        removeFile();
      } else if (code === 'INVALID_FILE_TYPE') {
        removeFile();
      } else {
        toast.error(err.message || 'Analysis failed. Please try again.');
      }
      setBusy(false);
    }
  }

  if (!isAuthenticated) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
          New Analysis
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-600">
          Submit an assignment and get an explainable authenticity report with quoted evidence.
        </p>
      </div>

      {!aiConfigured && (
        <ErrorAlert
          title="AI analysis is not configured"
          error={{
            message:
              'The server is missing OPENROUTER_API_KEY, so analyses will fail until it is added to backend/.env.',
            code: 'MISSING_API_KEY',
          }}
        />
      )}

      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Tabs value={tab} onChange={(t) => (busy ? null : setTab(t))} />
          <p className="text-xs text-ink-400">
            Minimum {MIN_WORDS} words · Max {formatBytes(maxFileSize || 5242880)} per file
          </p>
        </div>

        <div className="mt-6">
          {tab === 'upload' ? (
            <FileDropzone
              file={file}
              onFile={handleFile}
              onRemove={removeFile}
              disabled={busy}
              maxFileSize={maxFileSize || undefined}
              error={fileError}
            />
          ) : (
            <div>
              <label htmlFor="assignment" className="label">
                Assignment text
              </label>
              <textarea
                id="assignment"
                rows={14}
                className={`input thin-scroll resize-y font-normal leading-relaxed ${
                  textTouched && (textTooLong || (text.trim() && textTooShort)) ? 'input-error' : ''
                }`}
                placeholder="Paste your assignment text here..."
                value={text}
                disabled={busy}
                onChange={(e) => {
                  setText(e.target.value);
                  setTextTouched(true);
                  setError(null);
                }}
                aria-describedby="text-counts"
              />

              <div
                id="text-counts"
                className="mt-2.5 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-4 text-xs font-medium text-ink-500">
                  <span>
                    <span className="text-ink-800">{words.toLocaleString()}</span> words
                  </span>
                  <span>
                    <span className="text-ink-800">{chars.toLocaleString()}</span> characters
                  </span>
                </div>

                <span
                  className={`text-xs font-medium ${
                    textTooLong ? 'text-red-600' : words >= MIN_WORDS ? 'text-emerald-600' : 'text-ink-400'
                  }`}
                >
                  {textTooLong
                    ? `Over the ${MAX_CHARS.toLocaleString()} character limit`
                    : words >= MIN_WORDS
                      ? 'Ready to analyze'
                      : `${Math.max(0, MIN_WORDS - words)} more words needed`}
                </span>
              </div>

              {textTouched && text.trim() === '' && (
                <p className="field-error">
                  <AlertCircle size={13} />
                  Paste or type the assignment you want to analyze.
                </p>
              )}
              {textTooShort && text.trim() !== '' && (
                <p className="field-error">
                  <AlertCircle size={13} />
                  Assignment is too short. At least {MIN_WORDS} words are required.
                </p>
              )}
              {textTooLong && (
                <p className="field-error">
                  <AlertCircle size={13} />
                  Assignment is too long. Maximum is {MAX_CHARS.toLocaleString()} characters.
                </p>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-5">
            <ErrorAlert error={error} title="Analysis failed" onRetry={run} />
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 border-t border-ink-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-ink-500">
            {tab === 'upload'
              ? file
                ? `${file.name} selected · ${formatBytes(file.size)}`
                : 'PDF, DOCX or TXT — extracted server-side.'
              : 'Your text is cleaned and split into sections before analysis.'}
          </p>

          <button
            type="button"
            onClick={run}
            disabled={!canSubmit || busy}
            className="btn-primary !px-5 !py-3"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                {tab === 'upload' ? <FileUp size={16} /> : <Type size={16} />}
                {tab === 'upload' ? 'Analyze Assignment' : 'Analyze Text'}
                {!busy && <ArrowRight size={15} />}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Processing panel */}
      {busy && (
        <div className="card p-6 animate-fade-up">
          <div className="flex items-start gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <ScanSearch size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold text-ink-900">Analyzing your assignment</h2>
              <p className="mt-1 text-sm text-ink-500">
                Each step below reflects work happening on the server right now.
              </p>
              <div className="mt-5">
                <StageList
                  stages={STAGES.filter((s) => (tab === 'upload' ? true : !s.forFile))}
                  current={stage}
                />
              </div>
              <p className="mt-5 rounded-lg bg-ink-50 px-3.5 py-2.5 text-xs leading-relaxed text-ink-500">
                AI-detection is probabilistic. The report will describe patterns and evidence
                rather than a definitive verdict.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
