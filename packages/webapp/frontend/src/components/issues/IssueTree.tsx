import { useState } from "react";
import { Link } from "react-router";
import { useIssues } from "@/hooks/use-issues";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Issue } from "@/types";

interface IssueTreeProps {
  issues: Issue[];
}

export function IssueTree({ issues }: IssueTreeProps) {
  return (
    <div className="divide-y rounded-lg border bg-white">
      {issues.map((issue) => (
        <IssueTreeRow key={issue.id} issue={issue} depth={0} />
      ))}
    </div>
  );
}

interface IssueTreeRowProps {
  issue: Issue;
  depth: number;
}

function IssueTreeRow({ issue, depth }: IssueTreeRowProps) {
  const [expanded, setExpanded] = useState(false);

  const { data: children } = useIssues(
    expanded ? { parentId: issue.id } : {}
  );
  const hasChildren = expanded && children && children.length > 0;

  return (
    <>
      <div
        className="flex items-center hover:bg-slate-50 transition-colors"
        style={{ paddingLeft: `${depth * 24 + 16}px` }}
      >
        {/* Expand/collapse chevron */}
        <button
          className="flex h-9 w-6 shrink-0 items-center justify-center text-slate-400 hover:text-slate-600"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {/* Issue row content (link) */}
        <Link
          to={`/issues/${issue.id}`}
          className="flex flex-1 items-center gap-4 py-3 pr-4"
        >
          {/* ID */}
          <span className="shrink-0 font-mono text-xs text-slate-400 w-20">
            {issue.id}
          </span>

          {/* Title */}
          <span className="flex-1 truncate text-sm text-slate-900 font-medium">
            {issue.title}
          </span>

          {/* Status */}
          <span className="shrink-0" onClick={(e) => e.preventDefault()}>
            <StatusBadgeMini status={issue.status} />
          </span>

          {/* Priority */}
          <span className="shrink-0 w-14 text-sm text-slate-600">
            P{issue.priority}
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
              <span className="text-xs text-slate-400">
                +{issue.tags.length - 2}
              </span>
            )}
          </span>
        </Link>
      </div>

      {/* Children */}
      {hasChildren &&
        children.map((child) => (
          <IssueTreeRow key={child.id} issue={child} depth={depth + 1} />
        ))}
    </>
  );
}

const statusColors: Record<string, string> = {
  idea: "bg-gray-100 text-gray-700",
  todo: "bg-blue-100 text-blue-700",
  "in-progress": "bg-amber-100 text-amber-700",
  done: "bg-green-100 text-green-700",
  closed: "bg-red-100 text-red-700",
};

function StatusBadgeMini({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
        statusColors[status] || "bg-gray-100 text-gray-700"
      )}
    >
      {status === "in-progress"
        ? "In Progress"
        : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
