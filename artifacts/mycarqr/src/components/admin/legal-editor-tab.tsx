import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { adminFetch } from "./use-admin-fetch";

const SLUGS = [
  { slug: "about", label: "About Us" },
  { slug: "privacy", label: "Privacy Policy" },
  { slug: "terms", label: "Terms & Conditions" },
  { slug: "refund", label: "Refund Policy" },
  { slug: "shipping", label: "Shipping Policy" },
  { slug: "disclaimer", label: "Disclaimer" },
];

interface LegalPage {
  slug: string;
  title: string;
  content: string;
  updatedAt: string;
}

export default function LegalEditorTab() {
  const { toast } = useToast();
  const [slug, setSlug] = useState("about");
  const [page, setPage] = useState<LegalPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    setLoading(true);
    setPage(null);
    adminFetch<LegalPage>(`/api/legal/${slug}`)
      .then((p) => {
        setPage(p);
        setTitle(p.title);
        setContent(p.content);
      })
      .catch((err) => {
        toast({
          title: "Could not load page",
          description: err instanceof Error ? err.message : undefined,
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [slug, toast]);

  async function save() {
    if (!title.trim() || !content.trim()) {
      toast({ title: "Title and content are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await adminFetch(`/api/admin/legal/${slug}`, {
        method: "PUT",
        body: JSON.stringify({ title, content }),
      });
      toast({ title: "Saved", description: `${slug} updated.` });
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Legal & info pages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-[240px_1fr] gap-3 items-end">
          <div className="space-y-1.5">
            <Label>Page</Label>
            <Select value={slug} onValueChange={setSlug}>
              <SelectTrigger data-testid="select-legal-slug">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SLUGS.map((s) => (
                  <SelectItem key={s.slug} value={s.slug}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {page && (
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date(page.updatedAt).toLocaleString("en-IN")} · /{slug}
            </p>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="legal-title">Title</Label>
              <Input
                id="legal-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                data-testid="input-legal-title"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="legal-content">Markdown content</Label>
              <Textarea
                id="legal-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={20}
                className="font-mono text-xs"
                data-testid="input-legal-content"
              />
              <p className="text-xs text-muted-foreground">
                Supports markdown: <code>## Heading</code>, <code>**bold**</code>, links, lists.
              </p>
            </div>
            <Button onClick={save} disabled={saving} data-testid="button-save-legal">
              {saving ? "Saving..." : "Publish changes"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
