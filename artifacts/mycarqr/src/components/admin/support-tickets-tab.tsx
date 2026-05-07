import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { adminFetch, useAdminList } from "./use-admin-fetch";
import { Trash2 } from "lucide-react";

interface Ticket {
  id: number;
  userId: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
}

const STATUSES = ["open", "in_progress", "resolved", "closed"];
const TONE: Record<string, string> = {
  open: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  in_progress: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  resolved: "bg-green-500/15 text-green-700 dark:text-green-300",
  closed: "bg-muted text-muted-foreground",
};

export default function SupportTicketsTab() {
  const { toast } = useToast();
  const { data, loading, refresh } = useAdminList<Ticket>("/api/admin/support-tickets");
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  async function update(id: number, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      await adminFetch(`/api/admin/support-tickets/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      toast({ title: "Updated" });
      await refresh();
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this ticket?")) return;
    setBusyId(id);
    try {
      await adminFetch(`/api/admin/support-tickets/${id}`, { method: "DELETE" });
      await refresh();
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  if (loading && !data) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Support tickets {data ? <span className="text-sm font-normal text-muted-foreground">({data.length})</span> : null}
          </CardTitle>
        </CardHeader>
      </Card>
      {!data || data.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No tickets yet.
          </CardContent>
        </Card>
      ) : (
        data.map((t) => (
          <Card key={t.id} data-testid={`ticket-${t.id}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{t.subject}</p>
                    <Badge className={TONE[t.status] || TONE.open} variant="secondary">
                      {t.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.email} · {new Date(t.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
                <Button
                  variant="ghost" size="icon" className="text-destructive"
                  disabled={busyId === t.id} onClick={() => remove(t.id)}
                  data-testid={`ticket-delete-${t.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm whitespace-pre-line bg-muted/30 p-3 rounded-md">{t.message}</p>

              <div className="grid sm:grid-cols-[180px_1fr] gap-3 items-start">
                <Select
                  value={t.status}
                  onValueChange={(v) => update(t.id, { status: v })}
                  disabled={busyId === t.id}
                >
                  <SelectTrigger data-testid={`ticket-status-${t.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Reply / internal note (visible to user)"
                    rows={2}
                    value={draft[t.id] ?? t.adminNote ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [t.id]: e.target.value }))}
                    data-testid={`ticket-note-${t.id}`}
                  />
                  <Button
                    variant="outline"
                    onClick={() => update(t.id, { adminNote: draft[t.id] ?? "" })}
                    disabled={busyId === t.id || draft[t.id] === undefined}
                    data-testid={`ticket-save-${t.id}`}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
