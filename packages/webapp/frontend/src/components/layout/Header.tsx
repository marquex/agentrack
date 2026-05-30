import { useState } from "react";
import { Link, useLocation } from "react-router";
import { Upload, Download, Loader2, Check, AlertCircle, Users, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSyncPush, useSyncPull } from "@/hooks/use-sync";
import { useMediaQuery } from "@/hooks/use-media-query";

type SyncStatus = "idle" | "loading" | "success" | "error";

export function Header() {
  const location = useLocation();
  const pushMutation = useSyncPush();
  const pullMutation = useSyncPull();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [pushStatus, setPushStatus] = useState<SyncStatus>("idle");
  const [pullStatus, setPullStatus] = useState<SyncStatus>("idle");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const navigationItems = [
    { path: "/", label: "Dashboard", icon: null },
    { path: "/issues", label: "Issues", icon: null },
    { path: "/users", label: "Users", icon: Users },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b bg-white">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-xl font-semibold tracking-tight text-slate-900 hover:text-slate-700 transition-normal focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring outline-none">
              agentrack
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {navigationItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive(item.path) ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-1.5 hover:bg-slate-50 transition-colors transition-normal focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring outline-none"
                >
                  {item.icon && <item.icon className="h-3.5 w-3.5" />}
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>

          {/* Sync Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePush}
              disabled={pushStatus === "loading" || pullStatus === "loading"}
              className="gap-1.5 hover:bg-slate-50 transition-colors transition-normal focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring outline-none"
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
              className="gap-1.5 hover:bg-slate-50 transition-colors"
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

          {/* Mobile Menu Button */}
          {isMobile && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden hover:bg-slate-50 transition-colors transition-normal focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring outline-none"
                  />
                }
              >
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col gap-4 p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Navigation</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  {navigationItems.map((item) => (
                    <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}>
                      <Button
                        variant={isActive(item.path) ? "secondary" : "ghost"}
                        className="w-full justify-start gap-2"
                      >
                        {item.icon && <item.icon className="h-4 w-4" />}
                        {item.label}
                      </Button>
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </header>
  );
}
