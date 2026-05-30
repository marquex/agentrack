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
  onFiltersChange: (filters: Filters) => void;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "idea", label: "Idea" },
  { value: "todo", label: "Todo" },
  { value: "in-progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "closed", label: "Closed" },
];

export function IssueFilters({ filters, onFiltersChange }: IssueFiltersProps) {
  const { data: users } = useUsers();

  function hasActiveFilters(): boolean {
    return !!filters.status || !!filters.assignee || !!filters.search;
  }

  function clearFilters() {
    onFiltersChange({});
  }

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
          value={filters.search ?? ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value || undefined })
          }
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
          value={filters.status ?? "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              status: !value || value === "all" ? undefined : value,
            })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue />
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
            onFiltersChange({
              ...filters,
              assignee: !value || value === "all" ? undefined : value,
            })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue />
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
      {hasActiveFilters() && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
