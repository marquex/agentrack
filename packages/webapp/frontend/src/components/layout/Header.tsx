import { useState } from "react";
import { Link, useLocation } from "react-router";
import { Upload, Download, Loader2, Check, AlertCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSyncPush, useSyncPull } from "@/hooks/use-sync";

type SyncStatus = "idle" | "loading" | "success" | "error";

export function Header() {
  const location = useLocation();
  const pushMutation = useSyncPush();
  const pullMutation = useSyncPull();

  const [pushStatus, setPushStatus] = useState<SyncStatus>("idle");
  const [pullStatus, setPullStatus] = useState<SyncStatus>("idle");
  const [lastSync, setLastSync] = useState<Date | null>(null);

  function handlePush() {
    setPushStatus("loading");
    pushMutation.mutate(undefined, {
      onSuccess: () => {
        setPushStatus("success");
        setLastSync(new Date());
        setTimeout(() => setPushStatus("idle"), 2000);
      },
      onError: () => {
        setPushStatus("error");
        setTimeout(() => setPushStatus("idle"), 3000);
      },
    });
  }

  function handlePull() {
    setPullStatus("loading");
    pullMutation.mutate(undefined, {
      onSuccess: () => {
        setPullStatus("success");
        setLastSync(new Date());
        setTimeout(() => setPullStatus("idle"), 2000);
      },
      onError: () => {
        setPullStatus("error");
        setTimeout(() => setPullStatus("idle"), 3000);
      },
    });
  }

  return (
    <header className="border-b bg-white px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-xl font-semibold tracking-tight text-slate-900 hover:text-slate-700">
            agentrack
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/users">
            <Button
              variant={location.pathname === "/users" ? "secondary" : "ghost"}
              size="sm"
              className="gap-1.5"
            >
              <Users className="h-3.5 w-3.5" />
              Users
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePush}
            disabled={pushStatus === "loading" || pullStatus === "loading"}
            className="gap-1.5"
          >
            {pushStatus === "loading" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : pushStatus === "success" ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : pushStatus === "error" ? (
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            Push
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePull}
            disabled={pushStatus === "loading" || pullStatus === "loading"}
            className="gap-1.5"
          >
            {pullStatus === "loading" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : pullStatus === "success" ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : pullStatus === "error" ? (
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Pull
          </Button>
          {lastSync && (
            <span className="text-xs text-muted-foreground ml-2">
              Last sync: {lastSync.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
