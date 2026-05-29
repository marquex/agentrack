import { Badge } from "@/components/ui/badge";
import type { IssueStatus } from "@/types";

const statusConfig: Record<IssueStatus, { label: string; className: string }> = {
  idea: { label: "Idea", className: "bg-gray-100 text-gray-700 hover:bg-gray-100" },
  todo: { label: "Todo", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  "in-progress": { label: "In Progress", className: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
  done: { label: "Done", className: "bg-green-100 text-green-700 hover:bg-green-100" },
  closed: { label: "Closed", className: "bg-red-100 text-red-700 hover:bg-red-100" },
};

interface StatusBadgeProps {
  status: IssueStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
