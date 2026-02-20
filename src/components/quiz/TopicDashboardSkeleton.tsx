import { Skeleton } from '@/components/ui/skeleton';

export const TopicDashboardSkeleton = () => {
  return (
    <div className="space-y-4 mb-6 animate-in fade-in duration-300">
      {/* Search bar skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>

      {/* Overall progress skeleton */}
      <div className="bg-card rounded-2xl p-4 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex justify-between mt-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* Category skeletons */}
      {[1, 2, 3].map((cat) => (
        <div key={cat} className="bg-card rounded-2xl shadow-card overflow-hidden">
          {/* Category header */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div>
                <Skeleton className="h-5 w-36 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-5 w-5 rounded" />
          </div>

          {/* Topic cards inside first two categories */}
          {cat <= 2 && (
            <div className="px-4 pb-4 space-y-3">
              {[1, 2, 3].map((topic) => (
                <div
                  key={topic}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                >
                  <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                  <Skeleton className="h-8 w-16 rounded-lg flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
