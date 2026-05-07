import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface LegalPageData {
  slug: string;
  title: string;
  content: string;
  updatedAt: string;
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function LegalPageView({ slug, fallbackTitle }: { slug: string; fallbackTitle: string }) {
  const [data, setData] = useState<LegalPageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    fetch(`${basePath}/api/legal/${slug}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<LegalPageData>;
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-3">{fallbackTitle}</h1>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            We couldn't load this page right now. Please refresh and try again, or contact support if the issue persists.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-3">
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <div className="pt-4 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-10/12" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    );
  }

  const updated = new Date(data.updatedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="legal-title">{data.title}</h1>
        <p className="text-xs text-muted-foreground mt-2">Last updated: {updated}</p>
      </header>
      <div
        className="space-y-4 text-sm sm:text-[15px] leading-relaxed text-foreground/90 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-foreground [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-1.5 [&_h3]:text-foreground [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold [&_strong]:text-foreground [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-muted"
        data-testid="legal-body"
      >
        <ReactMarkdown>{data.content}</ReactMarkdown>
      </div>
    </article>
  );
}
