import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { issuesApi } from "@/api/issues";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, ChevronDown, ChevronRight, PlusCircle, Pencil, MessageSquare, ShieldAlert } from "lucide-react";
import type { HistoryEvent } from "@/types";

interface HistorySectionProps {
  issueId: string;
}

const eventTypeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  creation: { icon: PlusCircle, label: "Created", color: "text-green-500" },
  update: { icon: Pencil, label: "Updated", color: "text-blue-500" },
  comment: { icon: MessageSquare, label: "Comment added", color: "text-purple-500" },
  "comment-update": { icon: Pencil, label: "Comment edited", color: "text-purple-500" },
  "comment-delete": { icon: MessageSquare, label: "Comment deleted", color: "text-red-500" },
  "blockage-added": { icon: ShieldAlert, label: "Blockage added", color: "text-amber-500" },
  "blockage-resolved": { icon: ShieldAlert, label: "Blockage resolved", color: "text-green-500" },
  "blockage-deleted": { icon: ShieldAlert, label: "Blockage deleted", color: "text-red-500" },
};

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString();
}

function formatContentSummary(event: HistoryEvent): string | null {
  if (!event.content) return null;

  const c = event.content;

  if (event.type === "update") {
    const parts: string[] = [];
    if ("title" in c) parts.push(`title: "${c.title}"`);
    if ("status" in c) parts.push(`status: ${c.status}`);
    if ("priority" in c) parts.push(`priority: ${c.priority}`);
    if ("assignee" in c) parts.push(`assignee: ${c.assignee ?? "unassigned"}`);
    if ("tags" in c) parts.push(`tags: [${(c.tags as string[])?.join(", ")}]`);
    if ("parentId" in c) parts.push(`parent: ${c.parentId ?? "none"}`);
    return parts.join(", ");
  }

  if (event.type === "comment" || event.type === "comment-update") {
    return typeof c.content === "string" ? c.content : null;
  }

  if (event.type === "blockage-added" || event.type === "blockage-resolved" || event.type === "blockage-deleted") {
    return `blocker: ${c.blockerId ?? "unknown"}`;
  }

  return null;
}

export function HistorySection({ issueId }: HistorySectionProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: events, isLoading } = useQuery({
    queryKey: ["history", issueId],
    queryFn: () => issuesApi.history(issueId),
    enabled: !!issueId && expanded,
  });

  return (
    <div className="border-t pt-4">
      <button
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-slate-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-500" />
        )}
        <Clock className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-medium text-slate-700">
          History
        </h3>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : events && events.length > 0 ? (
            <div className="relative ml-2 border-l-2 border-slate-200 pl-4">
              {events.map((event, index) => {
                const config = eventTypeConfig[event.type] || {
                  icon: Clock,
                  label: event.type,
                  color: "text-slate-500",
                };
                const Icon = config.icon;
                const summary = formatContentSummary(event);

                return (
                  <div key={index} className="relative mb-3 last:mb-0">
                    {/* Timeline dot */}
                    <div className="absolute -left-[1.35rem] top-1 h-3 w-3 rounded-full border-2 border-white bg-slate-300" />

                    <div className="flex items-start gap-2">
                      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${config.color}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium text-slate-700">
                            {config.label}
                          </span>
                          {event.author && (
                            <span className="text-slate-500">
                              by {event.author}
                            </span>
                          )}
                          <span className="text-slate-400">
                            {formatTimestamp(event.timestamp)}
                          </span>
                        </div>
                        {summary && (
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {summary}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-2 text-sm text-slate-400">No history events.</p>
          )}
        </div>
      )}
    </div>
  );
}
