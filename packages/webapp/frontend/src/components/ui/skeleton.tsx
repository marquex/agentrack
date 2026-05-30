import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

function IssueRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      {/* ID */}
      <div className="shrink-0 font-mono text-xs text-slate-400 w-20 h-4 bg-muted rounded" />

      {/* Title */}
      <div className="flex-1 h-4 bg-muted rounded" />

      {/* Status */}
      <div className="shrink-0 w-8 h-4 bg-muted rounded-full" />

      {/* Priority */}
      <div className="shrink-0 w-14 h-4 bg-muted rounded" />

      {/* Assignee */}
      <div className="shrink-0 w-20 h-4 bg-muted rounded" />

      {/* Tags */}
      <div className="shrink-0 flex gap-1 max-w-32">
        <div className="h-4 bg-muted rounded w-8" />
        <div className="h-4 bg-muted rounded w-8" />
      </div>
    </div>
  )
}

function CommentSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-1/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-12 bg-muted rounded" />
      </div>
    </div>
  )
}

export { Skeleton, IssueRowSkeleton, CommentSkeleton }
