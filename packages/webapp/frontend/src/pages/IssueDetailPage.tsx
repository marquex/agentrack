import { useParams, Link } from "react-router";
import { useIssue, useUpdateIssue } from "@/hooks/use-issues";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PriorityIndicator } from "@/components/shared/PriorityIndicator";
import { TagInput } from "@/components/issue-detail/TagInput";
import { ParentSelector } from "@/components/issue-detail/ParentSelector";
import { CommentsSection } from "@/components/issue-detail/CommentsSection";
import { BlockagesSection } from "@/components/issue-detail/BlockagesSection";
import { SubIssuesSection } from "@/components/issue-detail/SubIssuesSection";
import { HistorySection } from "@/components/issue-detail/HistorySection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUsers } from "@/hooks/use-users";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import type { IssueStatus } from "@/types";

const STATUS_OPTIONS: IssueStatus[] = ["idea", "todo", "in-progress", "done", "closed"];
const PRIORITY_OPTIONS = [1, 2, 3, 4, 5] as const;

const statusLabel: Record<IssueStatus, string> = {
  idea: "Idea",
  todo: "Todo",
  "in-progress": "In Progress",
  done: "Done",
  closed: "Closed",
};

export function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: issue, isLoading, error } = useIssue(id!);
  const { data: users } = useUsers();
  const updateIssue = useUpdateIssue();

  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState("");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="py-10 text-center">
        <p className="text-slate-500">Issue not found or failed to load.</p>
        <Link to="/" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          Back to issues
        </Link>
      </div>
    );
  }

  function handleStatusChange(value: string | number | null) {
    updateIssue.mutate({ id: id!, data: { status: value as IssueStatus } });
  }

  function handlePriorityChange(value: string | number | null) {
    updateIssue.mutate({ id: id!, data: { priority: Number(value) } });
  }

  function handleAssigneeChange(value: string | number | null) {
    updateIssue.mutate({
      id: id!,
      data: { assignee: value === "__none__" ? null : String(value) },
    });
  }

  function handleDescriptionSave() {
    if (issue && descriptionValue !== issue.description) {
      updateIssue.mutate({ id: id!, data: { description: descriptionValue } });
    }
    setEditingDescription(false);
  }

  function handleTagsChange(tags: string[]) {
    updateIssue.mutate({ id: id!, data: { tags } });
  }

  return (
    <AppLayout
      pageTitle={issue.title}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Issues", href: "/issues" },
        { label: issue.title }
      ]}
    >
      <div className="space-y-6">
        {/* Properties row */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Status:</span>
            <Select value={issue.status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabel[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Priority:</span>
            <Select value={String(issue.priority)} onValueChange={handlePriorityChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((p) => (
                  <SelectItem key={p} value={String(p)}>
                    <PriorityIndicator priority={p} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignee */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Assignee:</span>
            <Select
              value={issue.assignee ?? "__none__"}
              onValueChange={handleAssigneeChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-slate-400">Unassigned</span>
                </SelectItem>
                {users?.map((u) => (
                  <SelectItem key={u.name} value={u.name}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status & Priority display */}
        <div className="flex items-center gap-3">
          <StatusBadge status={issue.status} />
          <PriorityIndicator priority={issue.priority} />
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Tags:</span>
          <TagInput tags={issue.tags} onTagsChange={handleTagsChange} />
        </div>

        {/* Parent */}
        <ParentSelector issueId={id!} parentId={issue.parentId} />

        {/* Timestamps */}
        <div className="flex gap-4 text-sm text-slate-400">
          <span>
            Created {new Date(issue.createdAt).toLocaleDateString()} by{" "}
            {issue.createdBy}
          </span>
          <span>
            Updated {new Date(issue.updatedAt).toLocaleDateString()}
          </span>
        </div>

        {/* Description */}
        <div className="border-t pt-4">
          <h3 className="mb-2 text-sm font-medium text-slate-700">Description</h3>
          {editingDescription ? (
            <div className="space-y-2">
              <Textarea
                value={descriptionValue}
                onChange={(e) => setDescriptionValue(e.target.value)}
                rows={6}
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleDescriptionSave}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingDescription(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="min-h-[80px] cursor-pointer rounded-md border border-dashed border-slate-200 p-3 text-sm text-slate-600 hover:border-slate-300"
              onClick={() => {
                setDescriptionValue(issue.description);
                setEditingDescription(true);
              }}
            >
              {issue.description || (
                <span className="italic text-slate-400">
                  Click to add a description...
                </span>
              )}
            </div>
          )}
        </div>

        {/* Blockages */}
        <BlockagesSection issueId={id!} />

        {/* Sub-issues */}
        <SubIssuesSection issueId={id!} />

        {/* Comments */}
        <CommentsSection issueId={id!} />

        {/* History */}
        <HistorySection issueId={id!} />
      </div>
    </AppLayout>
  );
}
