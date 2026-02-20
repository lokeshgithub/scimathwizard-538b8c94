import { Skeleton } from '@/components/ui/skeleton';

export const QuizCardSkeleton = () => {
  return (
    <div className="bg-card rounded-2xl shadow-card overflow-hidden animate-in fade-in duration-300">
      {/* Header gradient area */}
      <div className="bg-gradient-to-r from-primary/60 to-secondary/60 p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-20 bg-white/20" />
            <Skeleton className="h-7 w-16 rounded-full bg-white/20" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-14 rounded-full bg-white/20" />
            <Skeleton className="h-5 w-24 bg-white/20" />
          </div>
        </div>
      </div>

      {/* Question area */}
      <div className="p-6">
        <div className="mb-6 space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-5 w-3/5" />
        </div>

        {/* Answer options */}
        <div className="space-y-3 mb-6">
          {[1, 2, 3, 4].map((opt) => (
            <div
              key={opt}
              className="flex items-center gap-3 p-4 rounded-xl bg-muted"
            >
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <Skeleton className="h-4 flex-1" style={{ width: `${60 + Math.random() * 30}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
