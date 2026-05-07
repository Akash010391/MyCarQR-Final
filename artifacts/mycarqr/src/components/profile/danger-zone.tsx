import { useState } from "react";
import { useUser, useClerk } from "@clerk/react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, AlertTriangle } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function DangerZone() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const [confirmEmail, setConfirmEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function deleteAccount() {
    if (confirmEmail.trim().toLowerCase() !== email.toLowerCase()) {
      toast({
        title: "Email doesn't match",
        description: "Please type your account email exactly.",
        variant: "destructive",
      });
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`${basePath}/api/me`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      toast({ title: "Account deleted", description: "Sorry to see you go." });
      try {
        await signOut({ redirectUrl: "/" });
      } catch {
        navigate("/");
      }
    } catch (err) {
      toast({
        title: "Could not delete account",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
      setDeleting(false);
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-lg text-destructive flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Danger zone
        </CardTitle>
        <CardDescription>
          Irreversible actions. Once your account is deleted, all data is permanently removed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-destructive/30 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Delete this account</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Removes vehicles, alerts, documents, orders, SOS profile and tickets.
            </p>
          </div>
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" data-testid="button-delete-account">
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your MyCarQR account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes your vehicles, QR codes, alerts, documents, orders,
                  SOS profile and support history. <strong>This cannot be undone.</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-email">
                  Type <strong>{email}</strong> to confirm
                </Label>
                <Input
                  id="confirm-email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder={email}
                  autoComplete="off"
                  data-testid="input-confirm-email"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    deleteAccount();
                  }}
                  disabled={deleting || confirmEmail.trim().toLowerCase() !== email.toLowerCase()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-confirm-delete"
                >
                  {deleting ? "Deleting..." : "Delete forever"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
