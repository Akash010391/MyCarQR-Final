import { Link } from "wouter";
import { useState } from "react";
import {
  QrCode, Shield, Bell, Smartphone, ChevronDown, Check,
  Car, Zap, Eye, Lock, MapPin, AlertTriangle, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import PublicFooter from "@/components/layout/public-footer";

const alertTypes = [
  { icon: Car, label: "Please move your vehicle", color: "text-blue-600 bg-blue-50" },
  { icon: Zap, label: "Your lights are on", color: "text-yellow-600 bg-yellow-50" },
  { icon: MapPin, label: "Vehicle blocking the way", color: "text-orange-600 bg-orange-50" },
  { icon: Eye, label: "Window is open", color: "text-purple-600 bg-purple-50" },
  { icon: AlertTriangle, label: "Emergency", color: "text-red-600 bg-red-50" },
  { icon: Shield, label: "Minor damage noticed", color: "text-green-600 bg-green-50" },
];

const faqs = [
  {
    q: "Is my phone number shown publicly?",
    a: "No. When privacy mode is on, your number is never shown. Scanners can send you alerts through the app, and you choose how you're contacted."
  },
  {
    q: "What if someone misuses the QR?",
    a: "You can disable your QR anytime from your dashboard. All alerts include the time and type, and you can report abuse."
  },
  {
    q: "How does the QR code work?",
    a: "Each vehicle gets a unique QR code. When someone scans it, they land on a secure page where they can send you instant alerts."
  },
  {
    q: "Can I use one account for multiple vehicles?",
    a: "Free users get 1 vehicle. Premium users can add unlimited vehicles — great for families or fleet owners."
  },
];

export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <QrCode className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground">MyCarQR</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" data-testid="link-sign-in">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" data-testid="link-sign-up">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-24 px-4">
        <div className="absolute inset-0 bg-grid-white/[0.03] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <Badge className="mb-6 bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-sm px-4 py-1">
            Smart QR for Every Vehicle
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
            Your Car's Smart{" "}
            <span className="text-cyan-400">QR Identity</span>
          </h1>
          <p className="text-lg sm:text-xl text-blue-200 max-w-2xl mx-auto mb-10 leading-relaxed">
            Let anyone reach you instantly when your car is blocking, lights are on, or there is an emergency — without revealing your number publicly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up">
              <Button
                size="lg"
                className="bg-cyan-500 hover:bg-cyan-400 text-blue-950 font-bold px-8 shadow-lg"
                data-testid="cta-create-qr"
              >
                <QrCode className="w-5 h-5 mr-2" />
                Create My Car QR
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button
                size="lg"
                variant="outline"
                className="border-blue-400 text-blue-200 hover:bg-blue-900/50"
                data-testid="cta-how-it-works"
              >
                See How It Works
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="mb-4">The Problem</Badge>
            <h2 className="text-3xl font-bold text-foreground">Parking problems happen every day</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Your car blocks someone. Someone else's car is blocking you. Lights left on. A minor scratch. How do you reach the owner without making a scene?
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {alertTypes.map((a) => (
              <div key={a.label} className={cn("rounded-xl p-4 flex items-center gap-3", a.color, "bg-opacity-10")}>
                <a.icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="mb-4">How It Works</Badge>
            <h2 className="text-3xl font-bold">Up and running in 3 steps</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: "1", icon: Car, title: "Add your vehicle", desc: "Enter your vehicle details and privacy preferences. You control what's shown publicly." },
              { step: "2", icon: QrCode, title: "Download your QR", desc: "Get a unique QR code sticker. Stick it on your windshield or rear window." },
              { step: "3", icon: Bell, title: "Get instant alerts", desc: "When someone scans and sends an alert, you're notified immediately on your phone." },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center text-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <s.icon className="w-8 h-8 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                    {s.step}
                  </div>
                </div>
                <h3 className="font-bold text-lg">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="mb-4">Features</Badge>
            <h2 className="text-3xl font-bold">Everything you need</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Lock, title: "Privacy First", desc: "Your number stays private. Scanners use in-app alerts, not your real contact." },
              { icon: QrCode, title: "Custom QR Stickers", desc: "Download and print premium sticker designs for your vehicle's window." },
              { icon: Bell, title: "Instant Alerts", desc: "Real-time notifications when someone scans your vehicle's QR code." },
              { icon: FileText, title: "Document Reminders", desc: "Track insurance, pollution, registration, and service due dates." },
              { icon: Shield, title: "Safety Score", desc: "Monitor your vehicle's safety readiness with an easy score." },
              { icon: Smartphone, title: "Mobile First", desc: "Built for mobile. Works perfectly on any phone, tablet, or desktop." },
            ].map((f) => (
              <div key={f.title} className="bg-card border rounded-xl p-5 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="mb-4">Pricing</Badge>
            <h2 className="text-3xl font-bold">Simple, transparent pricing</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Free */}
            <div className="border rounded-2xl p-6 space-y-5">
              <div>
                <h3 className="font-bold text-xl">Free</h3>
                <div className="text-3xl font-extrabold mt-2">
                  ₹0 <span className="text-base font-normal text-muted-foreground">/ forever</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Get started with one vehicle</p>
              </div>
              <ul className="space-y-2 text-sm">
                {[
                  "1 vehicle",
                  "Basic QR code generation",
                  "Basic contact page",
                  "5 scan alerts / month",
                  "Limited scan history",
                ].map(f => (
                  <li key={f} className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 flex-shrink-0" />{f}</li>
                ))}
              </ul>
              <Link href="/sign-up">
                <Button variant="outline" className="w-full" data-testid="cta-free">Get Started Free</Button>
              </Link>
            </div>
            {/* Premium */}
            <div className="border-2 border-primary rounded-2xl p-6 space-y-5 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <Badge className="bg-primary text-white">Popular</Badge>
              </div>
              <div>
                <h3 className="font-bold text-xl">Premium</h3>
                <div className="text-3xl font-extrabold mt-2">
                  ₹99 <span className="text-base font-normal text-muted-foreground">/ month</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">or ₹599/year — save ₹589</p>
              </div>
              <ul className="space-y-2 text-sm">
                {[
                  "Unlimited vehicles",
                  "Custom QR sticker designs",
                  "Accident Witness Mode",
                  "SOS Emergency Profile",
                  "Lost Key / Found Item Mode",
                  "Full scan history",
                  "Priority alerts",
                  "Privacy mode",
                  "Document reminders",
                ].map(f => (
                  <li key={f} className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 flex-shrink-0" />{f}</li>
                ))}
              </ul>
              <Link href="/sign-up">
                <Button className="w-full" data-testid="cta-premium">Start Premium — ₹99/month</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Safety */}
      <section className="py-20 px-4 bg-green-50 dark:bg-green-950/20">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">Safety & Privacy</Badge>
          <h2 className="text-3xl font-bold">Your privacy is our priority</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
            {[
              "No unnecessary public phone display",
              "Owner controls all privacy settings",
              "QR can be disabled anytime",
              "Built-in abuse reporting",
              "Emergency contact stays private",
              "Data encrypted and secure",
            ].map(p => (
              <div key={p} className="flex items-center gap-3 bg-white dark:bg-green-950/30 rounded-lg p-3 border border-green-100 dark:border-green-900">
                <Shield className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm font-medium">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4">FAQ</Badge>
            <h2 className="text-3xl font-bold">Common questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-5 text-left font-semibold hover:bg-muted/50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  data-testid={`faq-${i}`}
                >
                  {faq.q}
                  <ChevronDown className={cn("w-4 h-4 flex-shrink-0 transition-transform", openFaq === i && "rotate-180")} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-muted-foreground text-sm leading-relaxed border-t bg-muted/20">
                    <p className="pt-4">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold">Protect your car today</h2>
          <p className="text-blue-200">Join thousands of car owners who never miss an important alert.</p>
          <Link href="/sign-up">
            <Button
              size="lg"
              className="bg-cyan-500 hover:bg-cyan-400 text-blue-950 font-bold px-10"
              data-testid="cta-bottom"
            >
              Create My Car QR — Free
            </Button>
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
