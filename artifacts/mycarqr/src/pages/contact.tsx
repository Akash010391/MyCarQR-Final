import { useState } from "react";
import { useUser } from "@clerk/react";
import PublicPage from "@/components/layout/public-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, MessageCircle, Phone, MapPin, CheckCircle2 } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Contact() {
  const { user } = useUser();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: user?.fullName ?? "",
    email: user?.primaryEmailAddress?.emailAddress ?? "",
    phone: "",
    message: "",
    website: "", // honeypot — humans never fill this
  });

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || form.message.trim().length < 10) {
      toast({
        title: "Missing details",
        description: "Please fill in name, email and at least a 10-character message.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${basePath}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Submit failed");
      setSubmitted(true);
      toast({
        title: "Message sent",
        description: "Thank you for contacting MyCarQR. Our team will get back to you soon.",
      });
    } catch (err) {
      toast({
        title: "Could not send",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicPage>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Get in touch</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Questions, feedback, or partnership ideas — we'd love to hear from you.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-3">
            <Card>
              <CardContent className="p-4 flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</p>
                  <a href="mailto:support@mycarqr.in" className="text-sm hover:underline">
                    support@mycarqr.in
                  </a>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-start gap-3">
                <MessageCircle className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">In-app</p>
                  <p className="text-sm">Use the form — fastest reply</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-start gap-3">
                <Phone className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hours</p>
                  <p className="text-sm">Mon–Sat, 10 AM – 7 PM IST</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Based in</p>
                  <p className="text-sm">India</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Send us a message</CardTitle>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="flex flex-col items-center text-center py-10 gap-3">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                  <h3 className="font-semibold text-lg">Thank you for contacting MyCarQR</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Our team will get back to you soon at <strong>{form.email}</strong>.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSubmitted(false);
                      setForm((f) => ({ ...f, message: "" }));
                    }}
                    data-testid="button-contact-another"
                  >
                    Send another
                  </Button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-4">
                  <div
                    aria-hidden="true"
                    style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}
                  >
                    <label htmlFor="contact-website">Website (leave empty)</label>
                    <input
                      id="contact-website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.website}
                      onChange={(e) => update("website", e.target.value)}
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-name">Full name *</Label>
                      <Input
                        id="contact-name"
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        placeholder="Your name"
                        maxLength={200}
                        required
                        data-testid="input-contact-name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-email">Email *</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        placeholder="you@example.com"
                        maxLength={200}
                        required
                        data-testid="input-contact-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-phone">Phone (optional)</Label>
                    <Input
                      id="contact-phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="+91 9XXXXXXXXX"
                      maxLength={40}
                      data-testid="input-contact-phone"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-message">Message *</Label>
                    <Textarea
                      id="contact-message"
                      value={form.message}
                      onChange={(e) => update("message", e.target.value)}
                      placeholder="How can we help?"
                      rows={6}
                      maxLength={4000}
                      required
                      data-testid="input-contact-message"
                    />
                    <p className="text-xs text-muted-foreground">{form.message.length}/4000</p>
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto"
                    data-testid="button-contact-submit"
                  >
                    {submitting ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicPage>
  );
}
