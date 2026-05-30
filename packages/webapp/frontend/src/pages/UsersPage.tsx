import { useState } from "react";
import { Key, Trash2, Copy, Check, UserPlus } from "lucide-react";
import { useUsers, useRegisterUser, useRevokeUser, useRegenerateToken } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AppLayout } from "@/components/layout/AppLayout";

export function UsersPage() {
  const { data: users, isLoading } = useUsers();
  const registerUser = useRegisterUser();
  const revokeUser = useRevokeUser();
  const regenerateToken = useRegenerateToken();

  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  // Revoke confirmation state
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  function handleRegister() {
    if (!newUserName.trim()) return;
    registerUser.mutate(newUserName.trim(), {
      onSuccess: (result) => {
        setNewUserName("");
        setShowRegisterDialog(false);
        setNewToken(result.token);
        setShowTokenDialog(true);
      },
    });
  }

  function handleRevoke(name: string) {
    revokeUser.mutate(name, {
      onSuccess: () => {
        setRevokeTarget(null);
      },
    });
  }

  function handleRegenerate(name: string) {
    regenerateToken.mutate(name, {
      onSuccess: (result) => {
        setNewToken(result.token);
        setShowTokenDialog(true);
      },
    });
  }

  function handleCopyToken() {
    if (newToken) {
      navigator.clipboard.writeText(newToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    }
  }

  return (
    <AppLayout
      pageTitle="Users"
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Users" }
      ]}
    >
      <div className="space-y-6">
        {/* Register button */}
        <div className="flex items-center justify-end">
          <Button
            onClick={() => setShowRegisterDialog(true)}
            className="gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            Register User
          </Button>
        </div>

        {/* User list */}
        {isLoading ? (
          <div className="py-10 text-center text-slate-400">Loading users...</div>
        ) : !users || users.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-slate-500">No users registered yet.</p>
            <p className="mt-1 text-sm text-slate-400">
              Register a user to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y rounded-lg border bg-white">
            {users.map((user) => (
              <div
                key={user.name}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-600">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {user.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      Registered {new Date(user.registeredAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => handleRegenerate(user.name)}
                    disabled={regenerateToken.isPending}
                  >
                    <Key className="h-3.5 w-3.5" />
                    Regenerate Token
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setRevokeTarget(user.name)}
                    disabled={revokeUser.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Register User Dialog */}
        <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register New User</DialogTitle>
              <DialogDescription>
                Create a new user. A token will be generated for authentication.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <Input
                placeholder="User name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRegister();
                }}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowRegisterDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRegister}
                disabled={!newUserName.trim() || registerUser.isPending}
              >
                {registerUser.isPending ? "Registering..." : "Register"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Token Display Dialog */}
        <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Token Generated</DialogTitle>
              <DialogDescription>
                Copy this token now. It will not be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-md bg-slate-50 p-3">
              <code className="flex-1 text-sm font-mono text-slate-800 break-all">
                {newToken}
              </code>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={handleCopyToken}
                className="shrink-0"
              >
                {tokenCopied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <DialogFooter showCloseButton>
              <Button onClick={() => setShowTokenDialog(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Revoke Confirmation Dialog */}
        <Dialog
          open={revokeTarget !== null}
          onOpenChange={(open) => {
            if (!open) setRevokeTarget(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revoke User</DialogTitle>
              <DialogDescription>
                Are you sure you want to revoke access for{" "}
                <Badge variant="secondary">{revokeTarget}</Badge>? Their token will
                be invalidated immediately.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRevokeTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => revokeTarget && handleRevoke(revokeTarget)}
                disabled={revokeUser.isPending}
              >
                {revokeUser.isPending ? "Revoking..." : "Revoke"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
