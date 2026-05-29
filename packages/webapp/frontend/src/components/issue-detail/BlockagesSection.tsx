import { useState } from "react";
import { Link } from "react-router";
import { useBlockages, useAddBlockage, useResolveBlockage, useDeleteBlockage } from "@/hooks/use-blockages";
import { useIssues } from "@/hooks/use-issues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldAlert, Plus, X, Check, ExternalLink } from "lucide-react";

interface BlockagesSectionProps {
  issueId: string;
}

export function BlockagesSection({ issueId }: BlockagesSectionProps) {
  const { data: blockages, isLoading } = useBlockages(issueId);
  const addBlockage = useAddBlockage(issueId);
  const resolveBlockage = useResolveBlockage(issueId);
  const deleteBlockage = useDeleteBlockage(issueId);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: searchResults } = useIssues(
    searchTerm ? { search: searchTerm } : {}
  );

  function handleAddBlockages() {
    if (selectedIds.length === 0) return;
    addBlockage.mutate(
      { blockerIds: selectedIds },
      {
        onSuccess: () => {
          setSelectedIds([]);
          setSearchTerm("");
          setShowAddDialog(false);
        },
      }
    );
  }

  function handleResolve(blockerId: string) {
    resolveBlockage.mutate({ blockerIds: [blockerId] });
  }

  function handleDelete(blockerId: string) {
    deleteBlockage.mutate(
      { blockerIds: [blockerId] },
      {
        onSuccess: () => {
          setDeleteConfirmId(null);
        },
      }
    );
  }

  function toggleSelect(id: string) {
    if (id === issueId) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  const hasBlockages =
    blockages &&
    ((blockages.blockedBy && blockages.blockedBy.length > 0) ||
      (blockages.blocks && blockages.blocks.length > 0));

  return (
    <div className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-medium text-slate-700">Blockages</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add blockage
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : hasBlockages ? (
        <div className="space-y-3">
          {/* Blocked by */}
          {blockages!.blockedBy.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">
                Blocked by
              </p>
              <div className="space-y-1">
                {blockages!.blockedBy.map((b) => (
                  <div
                    key={b.blockerId}
                    className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/issues/${b.blockerId}`}
                        className="flex items-center gap-1 font-mono text-xs text-blue-600 hover:underline"
                      >
                        {b.blockerId}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                      <Badge
                        variant="secondary"
                        className={
                          b.status === "active"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        }
                      >
                        {b.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {b.status === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => handleResolve(b.blockerId)}
                          disabled={resolveBlockage.isPending}
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Resolve
                        </Button>
                      )}
                      {deleteConfirmId === b.blockerId ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-red-600"
                            onClick={() => handleDelete(b.blockerId)}
                            disabled={deleteBlockage.isPending}
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setDeleteConfirmId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-slate-400 hover:text-red-600"
                          onClick={() => setDeleteConfirmId(b.blockerId)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blocks */}
          {blockages!.blocks.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">Blocks</p>
              <div className="space-y-1">
                {blockages!.blocks.map((b) => (
                  <div
                    key={b.blockedId}
                    className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2"
                  >
                    <Link
                      to={`/issues/${b.blockedId}`}
                      className="flex items-center gap-1 font-mono text-xs text-blue-600 hover:underline"
                    >
                      {b.blockedId}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    <Badge
                      variant="secondary"
                      className={
                        b.status === "active"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                      }
                    >
                      {b.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="py-2 text-sm text-slate-400">
          No blockages. This issue is not blocked by anything.
        </p>
      )}

      {/* Add blockage dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Blockage</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search issues to block by..."
              autoFocus
            />

            {/* Selected issues */}
            {selectedIds.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedIds.map((id) => (
                  <Badge key={id} variant="secondary" className="gap-1">
                    {id}
                    <button
                      onClick={() => toggleSelect(id)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Search results */}
            {searchTerm && searchResults && (
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {searchResults
                  .filter((i) => i.id !== issueId)
                  .map((issue) => (
                    <button
                      key={issue.id}
                      onClick={() => toggleSelect(issue.id)}
                      className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        selectedIds.includes(issue.id)
                          ? "border-blue-300 bg-blue-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <span className="font-mono text-xs text-slate-400">
                        {issue.id}
                      </span>
                      <span className="truncate text-slate-700">
                        {issue.title}
                      </span>
                    </button>
                  ))}
                {searchResults.filter((i) => i.id !== issueId).length ===
                  0 && (
                  <p className="py-2 text-center text-sm text-slate-400">
                    No issues found.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddBlockages}
                disabled={selectedIds.length === 0 || addBlockage.isPending}
              >
                {addBlockage.isPending ? "Adding..." : "Add Blockages"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
