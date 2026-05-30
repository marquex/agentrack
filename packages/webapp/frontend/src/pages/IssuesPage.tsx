import { useState } from "react";
import { IssueList } from "@/components/issues/IssueList";
import { IssueFilters } from "@/components/issues/IssueFilters";
import { CreateIssueDialog } from "@/components/issues/CreateIssueDialog";
import { AppLayout } from "@/components/layout/AppLayout";
import type { IssueFilters as Filters } from "@/types";

export function IssuesPage() {
  const [filters, setFilters] = useState<Filters>({});
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  return (
    <AppLayout
      pageTitle="Issues"
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Issues" }
      ]}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <CreateIssueDialog
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
          />
        </div>
        <IssueFilters filters={filters} onFiltersChange={setFilters} />
        <IssueList filters={filters} onCreateIssue={() => setShowCreateDialog(true)} />
      </div>
    </AppLayout>
  );
}
