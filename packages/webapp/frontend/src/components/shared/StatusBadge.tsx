import { Badge } from "@/components/ui/badge";
import { Circle, Clock, CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { IssueStatus } from "@/types";

interface StatusBadgeProps {
  status: IssueStatus;
}

const statusConfig: Record<IssueStatus, {
  label: string;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  ariaLabel: string;
}> = {
  idea: {
    label: "Idea",
    icon: <Lightbulb className="w-3 h-3" />,
    bgColor: "var(--agentrack-color-status-idea)",
    textColor: "oklch(0.985 0 0)",
    ariaLabel: "Idea"
  },
  todo: {
    label: "Todo",
    icon: <Circle className="w-3 h-3" />,
    bgColor: "var(--agentrack-color-status-todo)",
    textColor: "oklch(0.145 0 0)",
    ariaLabel: "Todo"
  },
  "in-progress": {
    label: "In Progress",
    icon: <Clock className="w-3 h-3" />,
    bgColor: "var(--agentrack-color-status-in-progress)",
    textColor: "oklch(0.145 0 0)",
    ariaLabel: "In Progress"
  },
  done: {
    label: "Done",
    icon: <CheckCircle2 className="w-3 h-3" />,
    bgColor: "var(--agentrack-color-status-done)",
    textColor: "oklch(0.145 0 0)",
    ariaLabel: "Done"
  },
  closed: {
    label: "Closed",
    icon: <XCircle className="w-3 h-3" />,
    bgColor: "var(--agentrack-color-status-closed)",
    textColor: "oklch(0.145 0 0)",
    ariaLabel: "Closed"
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Badge
              variant="secondary"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 transition-all transition-normal"
              style={{
                backgroundColor: config.bgColor,
                color: config.textColor,
              }}
              aria-label={`Status: ${config.ariaLabel}`}
            />
          }
        >
          {config.icon}
          <span className="text-xs font-medium">{config.label}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm font-medium">{config.ariaLabel}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
