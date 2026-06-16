import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUsers } from "@/hooks/use-users";
import type { IssueFilters as Filters } from "@/types";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IssueFiltersProps {
  filters: Filters;
  searchInput: string;
  onSetFilters: (partial: Filters) => void;
  onSearchChange: (value: string) => void;
  onClearFilters: () => void;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "all", label: "All statuses" },
  { value: "idea", label: "Idea" },
  { value: "todo", label: "Todo" },
  { value: "in-progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "closed", label: "Closed" },
];

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((opt) => [opt.value, opt.label]),
);

export function IssueFilters({
  filters,
  searchInput,
  onSetFilters,
  onSearchChange,
  onClearFilters,
}: IssueFiltersProps) {
  const { data: users } = useUsers();

  const hasActiveFilters =
    !!filters.search ||
    !!filters.assignee ||
    (!!filters.status && filters.status !== "open");

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative">
        <label htmlFor="search-filter" className="sr-only">
          Search issues
        </label>
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          id="search-filter"
          placeholder="Search issues..."
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search issues"
          className="h-8 w-56 pl-8"
        />
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2">
        <label htmlFor="status-filter" className="text-sm font-medium text-slate-700">
          Status
        </label>
        <Select
          id="status-filter"
          value={filters.status ?? "open"}
          onValueChange={(value) =>
            onSetFilters({
              status:
                !value || value === "open"
                  ? undefined
                  : value,
            })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue>{(value: string) => STATUS_LABEL[value] ?? value}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Assignee filter */}
      <div className="flex items-center gap-2">
        <label htmlFor="assignee-filter" className="text-sm font-medium text-slate-700">
          Assignee
        </label>
        <Select
          id="assignee-filter"
          value={filters.assignee ?? "all"}
          onValueChange={(value) =>
            onSetFilters({
              assignee: !value || value === "all" ? undefined : value,
            })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue>
              {(value: string) => (value === "all" ? "All assignees" : value)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            {users?.map((u) => (
              <SelectItem key={u.name} value={u.name}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
