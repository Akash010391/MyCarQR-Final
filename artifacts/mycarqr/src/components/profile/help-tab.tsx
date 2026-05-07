import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { LifeBuoy, Mail } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Faq {
  id: number;
  question: string;
  answer: string;
  category: string;
}

interface Ticket {
  id: number;
  subject: string;
  message: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
}

const STATUS_TONE: Record<string, string> = {
  open: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  in_progress: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  resolved: "bg-green-500/15 text-green-700 dark:text-green-300",
  closed: "bg-muted text-muted-foreground",
};

export default function HelpTab() {
  const { toast } = useToast();
  const [faqs, setFaqs] = useState<Faq[] | null>(null);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function loadTickets() {
    fetch(`${basePath}/api/me/support-tickets`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setTickets(Array.isArray(d) ? d : []))
      .catch(() => setTickets([]));
  }

  useEffect(() => {
    fetch(`${basePath}/api/faqs`)
      .then((r) => r.json())
      .then((d) => setFaqs(Array.isArray(d) ? d : []))
      .catch(() => setFaqs([]));
    loadTickets();
  }, []);

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || message.trim().length < 10) {
      toast({ title: "Add a subject and at least 10 characters", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${basePath}/api/support-tickets`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Submit failed");
      toast({ title: "Ticket created", description: "We'll reply by email when there's an update." });
      setSubject("");
      setMessage("");
      loadTickets();
    } catch (err) {
      toast({
        title: "Could not create ticket",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-primary" /> Frequently asked questions
          </CardTitle>
          <CardDescription>Quick answers to common things.</CardDescription>
        </CardHeader>
        <CardContent>
          {!faqs ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : faqs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No FAQs available yet.</p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((f) => (
                <AccordionItem key={f.id} value={`faq-${f.id}`}>
                  <AccordionTrigger className="text-sm text-left" data-testid={`faq-q-${f.id}`}>
                    {f.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground whitespace-pre-line">
                    {f.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
          <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Still need help?</span>
            <Link href="/contact">
              <Button variant="outline" size="sm" data-testid="button-go-contact">
                <Mail className="w-3.5 h-3.5 mr-2" /> Contact us
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Support tickets</CardTitle>
          <CardDescription>Open a private ticket — we reply by email.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitTicket} className="space-y-3 mb-6">
            <div className="space-y-1.5">
              <Label htmlFor="ticket-subject">Subject</Label>
              <Input
                id="ticket-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                placeholder="What's this about?"
                data-testid="input-ticket-subject"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ticket-message">Details</Label>
              <Textarea
                id="ticket-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={4000}
                placeholder="Describe the issue or request..."
                data-testid="input-ticket-message"
              />
            </div>
            <Button type="submit" disabled={submitting} data-testid="button-create-ticket">
              {submitting ? "Sending..." : "Create ticket"}
            </Button>
          </form>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your tickets
            </h3>
            {!tickets ? (
              <Skeleton className="h-16 w-full" />
            ) : tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">You haven't opened any tickets yet.</p>
            ) : (
              tickets.map((t) => (
                <div key={t.id} className="border rounded-lg p-3" data-testid={`ticket-${t.id}`}>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <p className="font-medium text-sm truncate">{t.subject}</p>
                    <Badge className={STATUS_TONE[t.status] || STATUS_TONE.open} variant="secondary">
                      {t.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.createdAt).toLocaleString("en-IN")}
                  </p>
                  <p className="text-sm mt-2 whitespace-pre-line text-foreground/90">{t.message}</p>
                  {t.adminNote && (
                    <div className="mt-3 p-3 rounded-md bg-muted/50 border-l-2 border-primary">
                      <p className="text-xs font-semibold text-primary mb-1">Reply from MyCarQR</p>
                      <p className="text-sm whitespace-pre-line">{t.adminNote}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
