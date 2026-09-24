const TABS = [
  { id: 'upload', label: 'Upload File' },
  { id: 'text', label: 'Paste Text' },
];

/**
 * Controlled tab switcher used on the New Analysis screen.
 */
export default function Tabs({ value, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Assignment input method"
      className="inline-flex rounded-lg border border-ink-200 bg-ink-50 p-1"
    >
      {TABS.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`relative rounded-md px-4 py-2 text-sm font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              active
                ? 'bg-white text-ink-900 shadow-sm'
                : 'text-ink-500 hover:text-ink-800'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
