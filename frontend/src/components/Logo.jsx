import { ShieldCheck } from 'lucide-react';

/**
 * Wordmark. `compact` drops the tagline for use in the app sidebar.
 */
export default function Logo({ size = 'md', showTagline = false, className = '' }) {
  const dims = {
    sm: { box: 'h-7 w-7 rounded-md', icon: 15, text: 'text-base' },
    md: { box: 'h-9 w-9 rounded-lg', icon: 19, text: 'text-lg' },
    lg: { box: 'h-11 w-11 rounded-xl', icon: 23, text: 'text-xl' },
  }[size];

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className={`grid place-items-center bg-gradient-to-br from-brand-600 to-violet-600 text-white shadow-sm ${dims.box}`}
        aria-hidden="true"
      >
        <ShieldCheck size={dims.icon} strokeWidth={2.4} />
      </span>
      <span className="flex flex-col leading-none">
        <span className={`font-bold tracking-tight text-ink-900 ${dims.text}`}>
          VeriWrite <span className="gradient-text">AI</span>
        </span>
        {showTagline && (
          <span className="mt-1 text-[11px] font-medium tracking-wide text-ink-500">
            From Detection Scores to Explainable Evidence
          </span>
        )}
      </span>
    </span>
  );
}
