import { cn } from "@/lib/utils";

const priorityConfig: Record<number, { label: string; color: string }> = {
  1: { label: "P1", color: "bg-red-500" },
  2: { label: "P2", color: "bg-orange-500" },
  3: { label: "P3", color: "bg-yellow-500" },
  4: { label: "P4", color: "bg-blue-500" },
  5: { label: "P5", color: "bg-gray-400" },
};

interface PriorityIndicatorProps {
  priority: number;
  className?: string;
}

export function PriorityIndicator({ priority, className }: PriorityIndicatorProps) {
  const config = priorityConfig[priority] || priorityConfig[3];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <span className={cn("h-2 w-2 rounded-full", config.color)} />
      <span className="text-slate-600">{config.label}</span>
    </span>
  );
}
