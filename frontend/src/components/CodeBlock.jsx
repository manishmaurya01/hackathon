import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

/**
 * Code block with a working copy button.
 * `value` is plain text (JSON gets stringified automatically).
 */
export default function CodeBlock({ value, label, language = 'json' }) {
  const [copied, setCopied] = useState(false);

  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback for browsers/contexts without clipboard permission.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        /* give up silently — text remains selectable */
      }
      document.body.removeChild(ta);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-ink-800 bg-ink-950">
      <div className="flex items-center justify-between border-b border-ink-800 px-4 py-2.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-400">
          {label || language}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md border border-ink-700 px-2.5 py-1 text-xs font-semibold text-ink-300 transition hover:border-ink-600 hover:bg-ink-800 hover:text-white"
          aria-label={copied ? 'Copied' : 'Copy to clipboard'}
        >
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="thin-scroll overflow-x-auto px-4 py-4 text-[12.5px] leading-relaxed">
        <code className="font-mono text-ink-100">{text}</code>
      </pre>
    </div>
  );
}
