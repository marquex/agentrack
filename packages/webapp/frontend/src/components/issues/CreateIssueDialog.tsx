import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateIssue } from "@/hooks/use-issues";
import { useUsers } from "@/hooks/use-users";
import { Plus } from "lucide-react";
import type { IssueStatus } from "@/types";

const STATUS_OPTIONS: IssueStatus[] = ["idea", "todo", "in-progress", "done", "closed"];

interface CreateIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultParentId?: string | null;
}

export function CreateIssueDialog({
  open,
  onOpenChange,
  defaultParentId,
}: CreateIssueDialogProps) {
  const { data: users } = useUsers();
  const createIssue = useCreateIssue();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<IssueStatus>("idea");
  const [assignee, setAssignee] = useState<string>("__none__");
  const [tags, setTags] = useState("");
  const [priority, setPriority] = useState("3");

  function resetForm() {
    setTitle("");
    setDescription("");
    setStatus("idea");
    setAssignee("__none__");
    setTags("");
    setPriority("3");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) return;

    createIssue.mutate(
      {
        title: title.trim(),
        description: description || undefined,
        status,
        assignee: assignee === "__none__" ? null : assignee,
        tags: tags
          ? tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
        priority: parseInt(priority, 10) || 3,
        parentId: defaultParentId ?? undefined,
      },
      {
        onSuccess: () => {
          resetForm();
          onOpenChange(false);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button size="sm" />}>
          <Plus className="mr-1 h-4 w-4" />
          New Issue
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Issue</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
            />
          </div>

          {/* Status + Priority row */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Status
              </label>
              <Select value={status} onValueChange={(v) => setStatus((v ?? "idea") as IssueStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Priority
              </label>
              <Select value={priority} onValueChange={(v) => setPriority(v ?? "3")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((p) => (
                    <SelectItem key={p} value={String(p)}>
                      P{p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Assignee
            </label>
            <Select value={assignee} onValueChange={(v) => setAssignee(v ?? "__none__")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Unassigned</SelectItem>
                {users?.map((u) => (
                  <SelectItem key={u.name} value={u.name}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Tags
            </label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Comma-separated tags"
            />
          </div>

          {/* Parent (read-only if provided) */}
          {defaultParentId && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Parent
              </label>
              <Input value={defaultParentId} disabled className="font-mono" />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || createIssue.isPending}>
              {createIssue.isPending ? "Creating..." : "Create Issue"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
