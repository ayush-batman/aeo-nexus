export default function DashboardLoading() {
  return <div role="status" aria-live="polite" aria-label="Loading page" className="space-y-6 p-4 sm:p-6">
    <div className="h-14 animate-pulse border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]" />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map(item => <div key={item} className="h-28 animate-pulse rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]" />)}</div>
    <div className="h-72 animate-pulse rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]" />
    <span className="sr-only">Loading dashboard content</span>
  </div>;
}
