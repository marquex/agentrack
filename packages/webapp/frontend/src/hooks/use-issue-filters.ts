import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import {
  isDashboardStatus,
  type DashboardStatus,
  type IssueFilters as Filters,
} from "@/types";

/**
 * Dashboard filter state driven by URL search params.
 *
 * The URL is the single source of truth:
 * - `status`: one of DashboardStatus. Absent means `open` (default).
 * - `assignee`: name string. Absent means all assignees.
 * - `search`: free text. Absent means no search.
 *
 * `parentId` is intentionally not URL-driven — the dashboard always shows
 * root issues.
 */
export function useIssueFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const statusParam = searchParams.get("status");
  const status: DashboardStatus = isDashboardStatus(statusParam)
    ? statusParam
    : "open";
  const assignee = searchParams.get("assignee") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  const filters: Filters = {
    status,
    assignee,
    search,
  };

  /**
   * Merge a partial filter update into the URL. Empty/undefined values
   * remove the corresponding param.
   */
  const setFilters = useCallback(
    (partial: Partial<Filters>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const key of ["status", "assignee", "search"] as const) {
            const value = partial[key];
            if (value === undefined || value === "") {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          }
          // Keep the URL clean: an empty params object yields no query string,
          // which the parser interprets as the default Open view.
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  /** Reset to no params (default Open view). */
  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: false });
  }, [setSearchParams]);

  // ─── Debounced search ──────────────────────────────────────────
  // Keep a local synchronous input value for snappy typing and push it
  // to the URL (and thus the query) on a debounce.
  const [searchInput, setSearchInput] = useState(search ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local input when the URL search changes externally (back/forward,
  // clear, deep-link).
  useEffect(() => {
    setSearchInput(search ?? "");
  }, [search]);

  const setSearch = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setFilters({ search: value || undefined });
      }, 250);
    },
    [setFilters],
  );

  // Clean up pending debounce on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    filters,
    status,
    assignee,
    search,
    searchInput,
    setFilters,
    setSearch,
    clearFilters,
  };
}
