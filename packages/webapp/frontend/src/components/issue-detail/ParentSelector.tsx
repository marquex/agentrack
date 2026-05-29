import { useState } from "react";
import { Link } from "react-router";
import { useIssues } from "@/hooks/use-issues";
import { useUpdateIssue } from "@/hooks/use-issues";
import { Button } from "@/components/ui/button";
import { ExternalLink, X } from "lucide-react";

interface ParentSelectorProps {
  issueId: string;
  parentId: string | null;
}

export function ParentSelector({ issueId, parentId }: ParentSelectorProps) {
  const [editing, setEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const updateIssue = useUpdateIssue();

  const { data: searchResults } = useIssues(
    searchTerm ? { search: searchTerm } : {}
  );

  function handleSetParent(newParentId: string) {
    updateIssue.mutate(
      { id: issueId, data: { parentId: newParentId } },
      {
        onSuccess: () => {
          setEditing(false);
          setSearchTerm("");
        },
      }
    );
  }

  function handleClearParent() {
    updateIssue.mutate(
      { id: issueId, data: { parentId: null } },
      {
        onSuccess: () => {
          setEditing(false);
          setSearchTerm("");
        },
      }
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-500">Parent:</span>
      {editing ? (
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for parent issue..."
              className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-blue-400"
              autoFocus
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false);
                setSearchTerm("");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {searchTerm && searchResults && (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-white p-1">
              {searchResults
                .filter((i) => i.id !== issueId)
                .map((issue) => (
                  <button
                    key={issue.id}
                    onClick={() => handleSetParent(issue.id)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="font-mono text-xs text-slate-400">
                      {issue.id}
                    </span>
                    <span className="truncate text-slate-700">
                      {issue.title}
                    </span>
                  </button>
                ))}
              {searchResults.filter((i) => i.id !== issueId).length === 0 && (
                <p className="px-2 py-1 text-sm text-slate-400">
                  No issues found.
                </p>
              )}
            </div>
          )}
        </div>
      ) : parentId ? (
        <div className="flex items-center gap-2">
          <Link
            to={`/issues/${parentId}`}
            className="flex items-center gap-1 font-mono text-sm text-blue-600 hover:underline"
          >
            {parentId}
            <ExternalLink className="h-3 w-3" />
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setEditing(true)}
          >
            Change
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-red-600"
            onClick={handleClearParent}
            disabled={updateIssue.isPending}
          >
            Clear
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">none</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setEditing(true)}
          >
            Set parent
          </Button>
        </div>
      )}
    </div>
  );
}
