import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PriorityIndicatorProps {
  priority: number;
  className?: string;
}

const priorityConfig: Record<number, {
  label: string;
  color: string;
  ariaLabel: string;
}> = {
  1: {
    label: "P1",
    color: "var(--agentrack-color-priority-p1)",
    ariaLabel: "Critical"
  },
  2: {
    label: "P2",
    color: "var(--agentrack-color-priority-p2)",
    ariaLabel: "High"
  },
  3: {
    label: "P3",
    color: "var(--agentrack-color-priority-p3)",
    ariaLabel: "Medium"
  },
  4: {
    label: "P4",
    color: "var(--agentrack-color-priority-p4)",
    ariaLabel: "Low"
  },
  5: {
    label: "P5",
    color: "var(--agentrack-color-priority-p5)",
    ariaLabel: "None"
  },
};

export function PriorityIndicator({ priority, className }: PriorityIndicatorProps) {
  const config = priorityConfig[priority] || priorityConfig[3];
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              className={cn("inline-flex items-center gap-2 text-sm font-medium transition-all transition-normal", className)}
              aria-label={`Priority ${config.label}: ${config.ariaLabel}`}
            />
          }
        >
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: config.color }}
          />
          <span className="text-slate-700">{config.label}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm font-medium">{config.ariaLabel}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}