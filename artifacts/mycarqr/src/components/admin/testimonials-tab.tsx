import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { adminFetch, useAdminList } from "./use-admin-fetch";
import { Plus, Trash2, Save, Star } from "lucide-react";

interface Testimonial {
  id: number;
  name: string;
  role: string;
  text: string;
  rating: number;
  avatarUrl: string;
  sortOrder: number;
  isPublished: boolean;
}

function Stars({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < n ? "fill-amber-400 text-amber-400" : "text-muted"}`}
        />
      ))}
    </div>
  );
}

export default function TestimonialsTab() {
  const { toast } = useToast();
  const { data, loading, refresh } = useAdminList<Testimonial>("/api/admin/testimonials");
  const [editing, setEditing] = useState<Record<number, Partial<Testimonial>>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    name: "", role: "", text: "", rating: 5, avatarUrl: "", sortOrder: 0, isPublished: true,
  });

  function setField(id: number, k: keyof Testimonial, v: any) {
    setEditing((s) => ({ ...s, [id]: { ...(s[id] || {}), [k]: v } }));
  }
  function value<K extends keyof Testimonial>(t: Testimonial, k: K): Testimonial[K] {
    const e = editing[t.id];
    return (e && k in e ? e[k] : t[k]) as Testimonial[K];
  }

  async function save(t: Testimonial) {
    const patch = editing[t.id];
    if (!patch) return;
    setBusyId(t.id);
    try {
      await adminFetch(`/api/admin/testimonials/${t.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      toast({ title: "Saved" });
      setEditing((s) => {
        const n = { ...s };
        delete n[t.id];
        return n;
      });
      await refresh();
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this testimonial?")) return;
    setBusyId(id);
    try {
      await adminFetch(`/api/admin/testimonials/${id}`, { method: "DELETE" });
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

  async function create() {
    if (!draft.name.trim() || !draft.text.trim()) {
      toast({ title: "Name and text are required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await adminFetch(`/api/admin/testimonials`, {
        method: "POST",
        body: JSON.stringify(draft),
      });
      toast({ title: "Testimonial added" });
      setDraft({ name: "", role: "", text: "", rating: 5, avatarUrl: "", sortOrder: 0, isPublished: true });
      await refresh();
    } catch (err) {
      toast({
        title: "Create failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add new testimonial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              placeholder="Customer name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              maxLength={100}
              data-testid="t-new-name"
            />
            <Input
              placeholder="Role / city (optional)"
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value })}
              maxLength={100}
              data-testid="t-new-role"
            />
          </div>
          <Textarea
            placeholder="Their words..."
            rows={3}
            value={draft.text}
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            maxLength={2000}
            data-testid="t-new-text"
          />
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Rating</Label>
              <Input
                type="number" min={1} max={5}
                value={draft.rating}
                onChange={(e) => setDraft({ ...draft, rating: Math.max(1, Math.min(5, Number(e.target.value) || 5)) })}
                data-testid="t-new-rating"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Avatar URL (optional)</Label>
              <Input
                value={draft.avatarUrl}
                onChange={(e) => setDraft({ ...draft, avatarUrl: e.target.value })}
                placeholder="https://..."
                data-testid="t-new-avatar"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.isPublished}
                onCheckedChange={(v) => setDraft({ ...draft, isPublished: v })}
                id="t-new-pub"
              />
              <Label htmlFor="t-new-pub" className="text-sm cursor-pointer">Publish</Label>
            </div>
            <Button onClick={create} disabled={creating} data-testid="t-new-submit">
              {creating ? "Adding..." : "Add"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && !data ? (
        <Skeleton className="h-32 w-full" />
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No testimonials yet.
          </CardContent>
        </Card>
      ) : (
        data.map((t) => {
          const dirty = editing[t.id] && Object.keys(editing[t.id] || {}).length > 0;
          return (
            <Card key={t.id} data-testid={`testimonial-${t.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Stars n={value(t, "rating")} />
                    <Badge variant={value(t, "isPublished") ? "default" : "secondary"}>
                      {value(t, "isPublished") ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <Button
                    size="icon" variant="ghost" className="text-destructive"
                    onClick={() => remove(t.id)} disabled={busyId === t.id}
                    data-testid={`t-delete-${t.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input
                    value={value(t, "name")}
                    onChange={(e) => setField(t.id, "name", e.target.value)}
                    placeholder="Name"
                  />
                  <Input
                    value={value(t, "role")}
                    onChange={(e) => setField(t.id, "role", e.target.value)}
                    placeholder="Role"
                  />
                </div>
                <Textarea
                  rows={3}
                  value={value(t, "text")}
                  onChange={(e) => setField(t.id, "text", e.target.value)}
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs">Rating</Label>
                      <Input
                        type="number" min={1} max={5} className="w-16 h-8"
                        value={value(t, "rating")}
                        onChange={(e) => setField(t.id, "rating", Math.max(1, Math.min(5, Number(e.target.value) || 5)))}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs">Order</Label>
                      <Input
                        type="number" className="w-16 h-8"
                        value={value(t, "sortOrder")}
                        onChange={(e) => setField(t.id, "sortOrder", Number(e.target.value) || 0)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={value(t, "isPublished")}
                        onCheckedChange={(v) => setField(t.id, "isPublished", v)}
                      />
                    </div>
                  </div>
                  <Button
                    size="sm" onClick={() => save(t)}
                    disabled={!dirty || busyId === t.id}
                    data-testid={`t-save-${t.id}`}
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" /> Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
