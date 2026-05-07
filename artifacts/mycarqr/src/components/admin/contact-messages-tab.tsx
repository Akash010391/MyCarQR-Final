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
import { Mail, Phone, Trash2 } from "lucide-react";

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
}

const STATUSES = ["new", "in_progress", "resolved", "spam"];
const TONE: Record<string, string> = {
  new: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  in_progress: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  resolved: "bg-green-500/15 text-green-700 dark:text-green-300",
  spam: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export default function ContactMessagesTab() {
  const { toast } = useToast();
  const { data, loading, refresh } = useAdminList<ContactMessage>("/api/admin/contact-messages");
  const [draftNotes, setDraftNotes] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  async function update(id: number, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      await adminFetch(`/api/admin/contact-messages/${id}`, {
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
    if (!confirm("Delete this message permanently?")) return;
    setBusyId(id);
    try {
      await adminFetch(`/api/admin/contact-messages/${id}`, { method: "DELETE" });
      toast({ title: "Deleted" });
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

  if (loading && !data) {
    return <Skeleton className="h-40 w-full" />;
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Contact messages {data ? <span className="text-muted-foreground text-sm font-normal">({data.length})</span> : null}
          </CardTitle>
        </CardHeader>
      </Card>
      {!data || data.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No messages yet.
          </CardContent>
        </Card>
      ) : (
        data.map((m) => (
          <Card key={m.id} data-testid={`contact-msg-${m.id}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{m.name}</p>
                    <Badge className={TONE[m.status] || TONE.new} variant="secondary">
                      {m.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{m.email}</span>
                    {m.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{m.phone}</span>}
                    <span>{new Date(m.createdAt).toLocaleString("en-IN")}</span>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  disabled={busyId === m.id}
                  onClick={() => remove(m.id)}
                  data-testid={`button-delete-msg-${m.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm whitespace-pre-line bg-muted/30 p-3 rounded-md">{m.message}</p>
              <div className="grid sm:grid-cols-[180px_1fr] gap-3 items-start">
                <Select
                  value={m.status}
                  onValueChange={(v) => update(m.id, { status: v })}
                  disabled={busyId === m.id}
                >
                  <SelectTrigger data-testid={`select-status-${m.id}`}>
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
                    placeholder="Internal note (visible to admins)"
                    rows={2}
                    value={draftNotes[m.id] ?? m.adminNote ?? ""}
                    onChange={(e) => setDraftNotes((d) => ({ ...d, [m.id]: e.target.value }))}
                    data-testid={`note-${m.id}`}
                  />
                  <Button
                    variant="outline"
                    onClick={() => update(m.id, { adminNote: draftNotes[m.id] ?? "" })}
                    disabled={busyId === m.id || draftNotes[m.id] === undefined}
                    data-testid={`save-note-${m.id}`}
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
