/**
 * Minimalist Luxury Loading Skeleton components with accessible shimmer sweep
 */
export function SkeletonCard({ className = '' }) {
  return (
    <div
      className={`rounded-3xl glass-card bg-bg-raised/40 dark:bg-white/[0.03] animate-pulse border border-border-ui/30 dark:border-white/10 p-5 ${className}`}
    >
      <div className="h-3.5 w-28 bg-border-ui/40 dark:bg-white/10 rounded-full mb-3" />
      <div className="h-8 w-24 bg-border-ui/50 dark:bg-white/15 rounded-xl mb-2" />
      <div className="h-3 w-36 bg-border-ui/30 dark:bg-white/5 rounded-full" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="rounded-3xl border border-border-ui/40 dark:border-white/10 overflow-hidden glass-card bg-bg-surface/50">
      <div className="h-11 bg-bg-base/40 border-b border-border-ui/20 dark:border-white/10" />
      <div className="divide-y divide-border-ui/20 dark:divide-white/5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between animate-pulse">
            <div className="space-y-2">
              <div className="h-4 w-40 bg-border-ui/40 dark:bg-white/10 rounded-full" />
              <div className="h-3 w-24 bg-border-ui/30 dark:bg-white/5 rounded-full" />
            </div>
            <div className="h-6 w-24 bg-border-ui/40 dark:bg-white/10 rounded-full" />
            <div className="h-8 w-20 bg-border-ui/30 dark:bg-white/5 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart({ height = 'h-64' }) {
  return (
    <div
      className={`w-full ${height} rounded-3xl glass-card bg-bg-raised/40 dark:bg-white/[0.03] animate-pulse border border-border-ui/30 dark:border-white/10 p-6 flex flex-col justify-end gap-2`}
    >
      <div className="flex items-end justify-between gap-3 h-48 w-full">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="w-full bg-border-ui/30 dark:bg-white/10 rounded-t-lg"
            style={{ height: `${30 + ((i * 12) % 65)}%` }}
          />
        ))}
      </div>
      <div className="h-3 w-full bg-border-ui/20 dark:bg-white/5 rounded-full mt-2" />
    </div>
  );
}

export default function LoadingSkeleton({ variant = 'card', ...props }) {
  if (variant === 'kpi' || variant === 'cards') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }
  if (variant === 'chart') return <SkeletonChart {...props} />;
  if (variant === 'table') return <SkeletonTable {...props} />;
  return <SkeletonCard {...props} />;
}
