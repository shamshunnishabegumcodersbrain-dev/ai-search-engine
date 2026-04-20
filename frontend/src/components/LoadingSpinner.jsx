// Skeleton loading — looks like real results loading, exactly like Google
function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl px-4 py-3 mb-2 animate-pulse">
      {/* Site row */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-4 h-4 rounded-sm bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      {/* Title */}
      <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
      {/* Description — two lines */}
      <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-700 mb-1.5" />
      <div className="h-3 w-5/6 rounded bg-gray-100 dark:bg-gray-700" />
    </div>
  );
}

export default function LoadingSpinner() {
  return (
    <div className="mt-2">
      {/* AI answer skeleton */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-2xl p-5 mb-6 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-800" />
          <div className="h-4 w-24 rounded bg-blue-200 dark:bg-blue-800" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-blue-100 dark:bg-blue-900" />
          <div className="h-3 w-11/12 rounded bg-blue-100 dark:bg-blue-900" />
          <div className="h-3 w-4/5 rounded bg-blue-100 dark:bg-blue-900" />
        </div>
      </div>

      {/* Result card skeletons */}
      {[1, 2, 3, 4, 5].map((n) => <SkeletonCard key={n} />)}
    </div>
  );
}