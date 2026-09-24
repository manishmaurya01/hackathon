import { AlertTriangle, Inbox, FileSearch, RefreshCw, WifiOff, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const VARIANTS = {
  error: { icon: AlertTriangle, tone: 'text-red-500 bg-red-50 border-red-100' },
  empty: { icon: Inbox, tone: 'text-ink-400 bg-ink-50 border-ink-100' },
  network: { icon: WifiOff, tone: 'text-amber-500 bg-amber-50 border-amber-100' },
  notfound: { icon: FileSearch, tone: 'text-ink-400 bg-ink-100 border-ink-200' },
  config: { icon: KeyRound, tone: 'text-brand-500 bg-brand-50 border-brand-100' },
};

/**
 * Every dead-end in the app renders one of these — never a blank screen.
 */
export default function EmptyState({
  variant = 'empty',
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  className = '',
}) {
  const navigate = useNavigate();
  const V = VARIANTS[variant] || VARIANTS.empty;
  const Icon = V.icon;

  return (
    <div className={`card flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
      <span className={`grid h-12 w-12 place-items-center rounded-xl border ${V.tone}`}>
        <Icon size={22} strokeWidth={2} />
      </span>

      <h3 className="mt-4 text-base font-semibold text-ink-900">{title}</h3>

      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-500">{description}</p>
      )}

      {(actionLabel || secondaryLabel) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => (onAction ? onAction() : navigate('/analyze'))}
            >
              {variant === 'network' && <RefreshCw size={15} />}
              {actionLabel}
            </button>
          )}
          {secondaryLabel && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => (onSecondary ? onSecondary() : navigate('/dashboard'))}
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
