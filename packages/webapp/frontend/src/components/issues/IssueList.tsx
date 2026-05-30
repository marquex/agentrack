import { useIssues } from "@/hooks/use-issues";
import { IssueTree } from "./IssueTree";
import { IssueRowSkeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IssueFilters } from "@/types";

interface IssueListProps {
  filters: IssueFilters;
  onCreateIssue: () => void;
}

export function IssueList({ filters, onCreateIssue }: IssueListProps) {
  const { data: issues, isLoading, error } = useIssues(filters);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <IssueRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load issues. Please try again.
      </div>
    );
  }

  if (!issues || issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <div className="text-slate-400 mb-4">
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          {filters.search || filters.status || filters.assignee
            ? "No issues match your filters"
            : "No issues yet"}
        </h3>
        <p className="text-slate-500 text-center mb-6 max-w-md">
          {filters.search || filters.status || filters.assignee
            ? "Try adjusting your filters or create a new issue to get started"
            : "Create your first issue to start tracking your work"}
        </p>
        <Button variant="default" size="lg" onClick={onCreateIssue} className="hover:scale-105 transition-all transition-normal focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring outline-none">
          <Plus className="mr-2 h-4 w-4" />
          Create Issue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <IssueTree issues={issues} />
    </div>
  );
}
