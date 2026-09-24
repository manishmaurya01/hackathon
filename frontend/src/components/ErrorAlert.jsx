import { Terminal } from 'lucide-react';

/**
 * Inline error callout for forms and panels.
 * Pass the caught Error from the services layer — `friendlyMessage`
 * is already attached by the axios interceptor.
 */
export default function ErrorAlert({ error, title, onRetry, className = '' }) {
  if (!error) return null;

  const message =
    typeof error === 'string'
      ? error
      : error.message || 'Something went wrong. Please try again.';

  const code = error?.details?.code || error?.code;

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 ${className}`}
    >
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-red-100 text-red-600">
        <span className="text-xs font-bold">!</span>
      </span>

      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-semibold text-red-800">{title}</p>}
        <p className="text-sm leading-relaxed text-red-700">{message}</p>
        {code && (
          <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-red-500">
            <Terminal size={11} />
            {String(code).replace(/_/g, ' ').toLowerCase()}
          </p>
        )}
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
        >
          Retry
        </button>
      )}
    </div>
  );
}
