export const Skeleton = ({ className = "" }: { className?: string }) => (
  <div aria-hidden className={`animate-pulse rounded-xl bg-warm-200/70 ${className}`} />
);
export const CardSkeleton = ({ lines = 3 }: { lines?: number }) => (
  <div className="card p-5 space-y-3" role="status" aria-label="Loading">
    <Skeleton className="h-4 w-1/3" />
    {Array.from({ length: lines }).map((_, i) => <Skeleton key={i} className="h-3 w-full" />)}
  </div>
);
