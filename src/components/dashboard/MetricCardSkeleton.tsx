export function MetricCardSkeleton() {
  return (
    <div className="metric-card animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 bg-muted rounded mb-3 w-24"></div>
          <div className="h-8 bg-muted rounded mb-2 w-20"></div>
          <div className="h-3 bg-muted rounded w-16"></div>
        </div>
        <div className="w-12 h-12 bg-muted rounded-xl"></div>
      </div>
    </div>
  );
}