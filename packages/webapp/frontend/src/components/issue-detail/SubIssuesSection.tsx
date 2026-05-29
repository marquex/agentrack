import { useState } from "react";
import { Link } from "react-router";
import { useIssues } from "@/hooks/use-issues";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Plus, ChevronRight } from "lucide-react";
import { CreateIssueDialog } from "@/components/issues/CreateIssueDialog";

interface SubIssuesSectionProps {
  issueId: string;
}

export function SubIssuesSection({ issueId }: SubIssuesSectionProps) {
  const { data: children, isLoading } = useIssues({ parentId: issueId });
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  return (
    <div className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">
          Sub-issues {children ? `(${children.length})` : ""}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="mr-1 h-3 w-3" />
          Create sub-issue
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-10 rounded-md bg-slate-100" />
          <div className="h-10 rounded-md bg-slate-100" />
        </div>
      ) : children && children.length > 0 ? (
        <div className="space-y-1">
          {children.map((child) => (
            <Link
              key={child.id}
              to={`/issues/${child.id}`}
              className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-slate-400" />
              <span className="font-mono text-xs text-slate-400">
                {child.id}
              </span>
              <span className="flex-1 truncate text-sm text-slate-700">
                {child.title}
              </span>
              <StatusBadge status={child.status} />
            </Link>
          ))}
        </div>
      ) : (
        <p className="py-2 text-sm text-slate-400">
          No sub-issues. Create one to break this issue down.
        </p>
      )}

      <CreateIssueDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        defaultParentId={issueId}
      />
    </div>
  );
}
