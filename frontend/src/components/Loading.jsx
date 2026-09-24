export function PageLoader({ label = 'Loading…', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-16 ${className}`}>
      <span
        className="h-8 w-8 animate-spin rounded-full border-[3px] border-ink-200 border-t-brand-600"
        aria-hidden="true"
      />
      <p className="text-sm font-medium text-ink-500">{label}</p>
    </div>
  );
}

export function Spinner({ size = 16, className = '' }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export function StatSkeleton() {
  return (
    <div className="card p-5">
      <div className="skeleton h-3 w-24" />
      <div className="skeleton mt-4 h-8 w-16" />
      <div className="skeleton mt-3 h-3 w-32" />
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-ink-100 px-5 py-4">
      <div className="skeleton h-4 flex-1" />
      <div className="skeleton h-4 w-24" />
      <div className="skeleton h-6 w-28 rounded-full" />
      <div className="skeleton h-4 w-20" />
    </div>
  );
}

export function ReportListSkeleton({ rows = 5 }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex gap-4 border-b border-ink-100 bg-ink-50/60 px-5 py-3">
        {['Assignment', 'Date', 'Status', 'AI Signal', 'Sections', ''].map((h) => (
          <div key={h} className="skeleton h-3 w-20" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <RowSkeleton key={i} />
      ))}
    </div>
  );
}

export function ReportDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="skeleton h-3 w-32" />
        <div className="skeleton mt-3 h-7 w-72" />
        <div className="skeleton mt-3 h-3 w-48" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton mt-3 h-7 w-24" />
          </div>
        ))}
      </div>
      <div className="card p-6">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton mt-4 h-3 w-full" />
        <div className="skeleton mt-2 h-3 w-5/6" />
        <div className="skeleton mt-2 h-3 w-2/3" />
      </div>
    </div>
  );
}
