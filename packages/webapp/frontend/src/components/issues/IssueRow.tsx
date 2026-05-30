import { Link } from "react-router";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PriorityIndicator } from "@/components/shared/PriorityIndicator";
import type { Issue } from "@/types";

interface IssueRowProps {
  issue: Issue;
}

export function IssueRow({ issue }: IssueRowProps) {
  return (
    <Link
      to={`/issues/${issue.id}`}
      className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors transition-normal focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring outline-none"
    >
      {/* ID */}
      <span className="shrink-0 font-mono text-xs text-slate-400 w-20">
        {issue.id}
      </span>

      {/* Title */}
      <span className="flex-1 truncate text-sm text-slate-900">
        {issue.title}
      </span>

      {/* Status */}
      <span className="shrink-0">
        <StatusBadge status={issue.status} />
      </span>

      {/* Priority */}
      <span className="shrink-0 w-14">
        <PriorityIndicator priority={issue.priority} />
      </span>

      {/* Assignee */}
      <span className="shrink-0 w-20 text-sm text-slate-500 truncate">
        {issue.assignee || "—"}
      </span>

      {/* Tags */}
      <span className="shrink-0 flex gap-1 max-w-32">
        {issue.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500"
          >
            {tag}
          </span>
        ))}
        {issue.tags.length > 2 && (
          <span className="text-xs text-slate-400">+{issue.tags.length - 2}</span>
        )}
      </span>
    </Link>
  );
}
