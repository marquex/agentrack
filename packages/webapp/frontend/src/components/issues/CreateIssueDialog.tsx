import { useState, useEffect, useRef } from "react";
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
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<IssueStatus>("idea");
  const [assignee, setAssignee] = useState<string>("__none__");
  const [tags, setTags] = useState("");
  const [priority, setPriority] = useState("3");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (open && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [open]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setStatus("idea");
    setAssignee("__none__");
    setTags("");
    setPriority("3");
    setErrors({});
  }

  function validateForm() {
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    } else if (title.trim().length < 3) {
      newErrors.title = "Title must be at least 3 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

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
        onError: (error) => {
          console.error("Failed to create issue:", error);
          setErrors({ submit: "Failed to create issue. Please try again." });
        },
      }
    );
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
    if (errors.title) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.title;
        return newErrors;
      });
    }
  }

  function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDescription(e.target.value);
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
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              id="title"
              ref={titleInputRef}
              value={title}
              onChange={handleTitleChange}
              placeholder="Issue title"
              required
              aria-required="true"
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? "title-error" : undefined}
              className={errors.title ? "border-red-500" : ""}
              disabled={createIssue.isPending}
            />
            {errors.title && (
              <p
                id="title-error"
                role="alert"
                className="mt-1 text-sm text-red-600"
              >
                {errors.title}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Description
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={handleDescriptionChange}
              placeholder="Optional description..."
              rows={3}
              aria-describedby="description-hint"
              disabled={createIssue.isPending}
            />
            <p
              id="description-hint"
              className="mt-1 text-xs text-slate-500"
            >
              Provide additional context for the issue
            </p>
          </div>

          {/* Status + Priority row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Status
              </label>
              <Select
                id="status"
                value={status}
                onValueChange={(v) => setStatus((v ?? "idea") as IssueStatus)}
                disabled={createIssue.isPending}
              >
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
            <div>
              <label
                htmlFor="priority"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Priority
              </label>
              <Select
                id="priority"
                value={priority}
                onValueChange={(v) => setPriority(v ?? "3")}
                disabled={createIssue.isPending}
              >
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
            <label
              htmlFor="assignee"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Assignee
            </label>
            <Select
              id="assignee"
              value={assignee}
              onValueChange={(v) => setAssignee(v ?? "__none__")}
              disabled={createIssue.isPending}
            >
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
            <label
              htmlFor="tags"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Tags
            </label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Comma-separated tags"
              aria-describedby="tags-hint"
              disabled={createIssue.isPending}
            />
            <p
              id="tags-hint"
              className="mt-1 text-xs text-slate-500"
            >
              Add tags to categorize this issue (comma-separated)
            </p>
          </div>

          {/* Parent (read-only if provided) */}
          {defaultParentId && (
            <div>
              <label
                htmlFor="parent"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Parent
              </label>
              <Input
                id="parent"
                value={defaultParentId}
                disabled
                className="font-mono"
                aria-describedby="parent-hint"
              />
              <p
                id="parent-hint"
                className="mt-1 text-xs text-slate-500"
              >
                This issue is a child of the parent issue
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createIssue.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || createIssue.isPending}
              className="flex items-center gap-2"
            >
              {createIssue.isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </>
              ) : (
                "Create Issue"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
