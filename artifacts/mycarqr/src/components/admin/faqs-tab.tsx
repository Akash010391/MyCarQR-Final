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
import { Plus, Trash2, Save } from "lucide-react";

interface Faq {
  id: number;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isPublished: boolean;
}

export default function FaqsTab() {
  const { toast } = useToast();
  const { data, loading, refresh } = useAdminList<Faq>("/api/admin/faqs");
  const [editing, setEditing] = useState<Record<number, Partial<Faq>>>({});
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [draft, setDraft] = useState({
    question: "",
    answer: "",
    category: "general",
    sortOrder: 0,
    isPublished: true,
  });

  function setField(id: number, k: keyof Faq, v: any) {
    setEditing((s) => ({ ...s, [id]: { ...(s[id] || {}), [k]: v } }));
  }
  function value<K extends keyof Faq>(faq: Faq, k: K): Faq[K] {
    const e = editing[faq.id];
    return (e && k in e ? e[k] : faq[k]) as Faq[K];
  }

  async function save(faq: Faq) {
    const patch = editing[faq.id];
    if (!patch) return;
    setBusyId(faq.id);
    try {
      await adminFetch(`/api/admin/faqs/${faq.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      toast({ title: "Saved" });
      setEditing((s) => {
        const n = { ...s };
        delete n[faq.id];
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
    if (!confirm("Delete this FAQ?")) return;
    setBusyId(id);
    try {
      await adminFetch(`/api/admin/faqs/${id}`, { method: "DELETE" });
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
    if (!draft.question.trim() || !draft.answer.trim()) {
      toast({ title: "Question and answer are required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await adminFetch(`/api/admin/faqs`, {
        method: "POST",
        body: JSON.stringify(draft),
      });
      toast({ title: "FAQ added" });
      setDraft({ question: "", answer: "", category: "general", sortOrder: 0, isPublished: true });
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
            <Plus className="w-4 h-4" /> Add new FAQ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-[1fr_140px_100px] gap-3">
            <Input
              placeholder="Question"
              value={draft.question}
              onChange={(e) => setDraft({ ...draft, question: e.target.value })}
              maxLength={500}
              data-testid="faq-new-question"
            />
            <Input
              placeholder="Category"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              maxLength={50}
              data-testid="faq-new-category"
            />
            <Input
              type="number"
              placeholder="Order"
              value={draft.sortOrder}
              onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })}
              data-testid="faq-new-order"
            />
          </div>
          <Textarea
            placeholder="Answer (markdown supported)"
            rows={3}
            value={draft.answer}
            onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
            maxLength={5000}
            data-testid="faq-new-answer"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.isPublished}
                onCheckedChange={(v) => setDraft({ ...draft, isPublished: v })}
                id="faq-new-pub"
              />
              <Label htmlFor="faq-new-pub" className="text-sm cursor-pointer">Publish</Label>
            </div>
            <Button onClick={create} disabled={creating} data-testid="faq-new-submit">
              {creating ? "Adding..." : "Add FAQ"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && !data ? (
        <Skeleton className="h-32 w-full" />
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No FAQs yet.
          </CardContent>
        </Card>
      ) : (
        data.map((f) => {
          const dirty = editing[f.id] && Object.keys(editing[f.id] || {}).length > 0;
          return (
            <Card key={f.id} data-testid={`faq-${f.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="secondary" className="text-xs">{value(f, "category")}</Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => remove(f.id)}
                    disabled={busyId === f.id}
                    data-testid={`faq-delete-${f.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <Input
                  value={value(f, "question")}
                  onChange={(e) => setField(f.id, "question", e.target.value)}
                  className="font-medium"
                  data-testid={`faq-q-${f.id}`}
                />
                <Textarea
                  value={value(f, "answer")}
                  onChange={(e) => setField(f.id, "answer", e.target.value)}
                  rows={3}
                  data-testid={`faq-a-${f.id}`}
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Order</Label>
                      <Input
                        type="number"
                        className="w-20 h-8"
                        value={value(f, "sortOrder")}
                        onChange={(e) => setField(f.id, "sortOrder", Number(e.target.value) || 0)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={value(f, "isPublished")}
                        onCheckedChange={(v) => setField(f.id, "isPublished", v)}
                      />
                      <span className="text-xs">{value(f, "isPublished") ? "Published" : "Draft"}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => save(f)}
                    disabled={!dirty || busyId === f.id}
                    data-testid={`faq-save-${f.id}`}
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
