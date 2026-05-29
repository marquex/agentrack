import { useIssues } from "@/hooks/use-issues";
import { IssueTree } from "./IssueTree";
import { Skeleton } from "@/components/ui/skeleton";
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
          <Skeleton key={i} className="h-12 w-full" />
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
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <p className="text-slate-500">
          {filters.search || filters.status || filters.assignee
            ? "No issues match your filters."
            : "No issues yet."}
        </p>
        <Button variant="outline" size="sm" onClick={onCreateIssue}>
          <Plus className="mr-1 h-4 w-4" />
          Create your first issue
        </Button>
      </div>
    );
  }

  return <IssueTree issues={issues} />;
}
