import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { QrCode, ScanLine, Bell, Shield, AlertTriangle, KeyRound, FileText, HeartPulse, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ONBOARDING_KEY = "mycarqr_onboarding_done";

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function markOnboardingDone(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, "1");
  } catch {}
}

interface Slide {
  title: string;
  description: string;
  content: React.ReactNode;
}

function QrOnCarIllustration() {
  return (
    <div className="relative w-56 h-56 mx-auto">
      <div className="absolute inset-4 rounded-2xl bg-gradient-to-br from-blue-900 to-slate-800 shadow-2xl flex items-center justify-center">
        <div className="relative">
          <div className="w-20 h-14 rounded-lg bg-slate-600 border-2 border-slate-500 flex items-center justify-center">
            <div className="w-3 h-2 rounded-full bg-yellow-400 absolute -top-1 left-3" />
            <div className="w-3 h-2 rounded-full bg-yellow-400 absolute -top-1 right-3" />
            <div className="w-12 h-8 rounded bg-slate-700 border border-slate-500 flex items-center justify-center">
              <QrCode className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <div className="w-16 h-1 rounded bg-slate-700 mx-auto mt-0.5" />
          <div className="flex justify-between px-1 mt-0.5">
            <div className="w-3 h-3 rounded-full bg-slate-600 border border-slate-500" />
            <div className="w-3 h-3 rounded-full bg-slate-600 border border-slate-500" />
          </div>
        </div>
      </div>
      <div className="absolute -top-2 -right-2 w-14 h-14 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center animate-pulse">
        <QrCode className="w-7 h-7 text-cyan-400" />
      </div>
      <div className="absolute -bottom-1 -left-1 w-10 h-10 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
        <Shield className="w-5 h-5 text-blue-400" />
      </div>
    </div>
  );
}

function HowItWorksIllustration() {
  const steps = [
    { icon: QrCode, label: "Stick QR", color: "bg-cyan-500/20 text-cyan-400 border-cyan-400/30" },
    { icon: ScanLine, label: "Someone scans", color: "bg-blue-500/20 text-blue-400 border-blue-400/30" },
    { icon: Bell, label: "You get notified", color: "bg-green-500/20 text-green-400 border-green-400/30" },
  ];

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-xs mx-auto">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-3 w-full">
          <div className={cn("w-14 h-14 rounded-xl border flex items-center justify-center flex-shrink-0", step.color)}>
            <step.icon className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">{step.label}</p>
            <p className="text-blue-300 text-xs">
              {i === 0 && "Place the QR sticker on your windshield"}
              {i === 1 && "Anyone can scan it to reach you"}
              {i === 2 && "Get instant alerts on your phone"}
            </p>
          </div>
          {i < steps.length - 1 && (
            <ChevronRight className="w-4 h-4 text-blue-500/50 flex-shrink-0 rotate-90 -mr-1" />
          )}
        </div>
      ))}
    </div>
  );
}

function ProtectionListIllustration() {
  const features = [
    { icon: Bell, label: "Instant Alerts", color: "text-cyan-400" },
    { icon: AlertTriangle, label: "Accident Reports", color: "text-orange-400" },
    { icon: KeyRound, label: "Lost Key Returns", color: "text-yellow-400" },
    { icon: HeartPulse, label: "SOS Emergency", color: "text-red-400" },
    { icon: FileText, label: "Vehicle Documents", color: "text-green-400" },
  ];

  return (
    <div className="w-full max-w-xs mx-auto space-y-2.5">
      {features.map((f) => (
        <div
          key={f.label}
          className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10"
        >
          <div className={cn("w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0", f.color)}>
            <f.icon className="w-5 h-5" />
          </div>
          <span className="text-white font-medium text-sm">{f.label}</span>
        </div>
      ))}
    </div>
  );
}

const slides: Slide[] = [
  {
    title: "Your Car's Digital Identity",
    description: "Stick a QR on your car. Anyone can reach you instantly — without knowing your number.",
    content: <QrOnCarIllustration />,
  },
  {
    title: "Scan. Alert. Connect.",
    description: "Three simple steps to keep your car connected and you informed.",
    content: <HowItWorksIllustration />,
  },
  {
    title: "Complete Car Protection",
    description: "Everything you need to stay safe, organized, and reachable.",
    content: <ProtectionListIllustration />,
  },
];

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const [, setLocation] = useLocation();
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasSeenOnboarding()) {
      setLocation("/", { replace: true });
    }
  }, [setLocation]);

  const finish = useCallback(() => {
    markOnboardingDone();
    setLocation("/sign-up");
  }, [setLocation]);

  const skip = useCallback(() => {
    markOnboardingDone();
    setLocation("/sign-up");
  }, [setLocation]);

  const next = useCallback(() => {
    if (current < slides.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      finish();
    }
  }, [current, finish]);

  const prev = useCallback(() => {
    if (current > 0) setCurrent((c) => c - 1);
  }, [current]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (diff > threshold) next();
    else if (diff < -threshold) prev();
  }, [next, prev]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [next, prev]);

  return (
    <div
      className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col overflow-hidden"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex justify-end px-4 pt-4">
        {current < slides.length - 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={skip}
            className="text-blue-300 hover:text-white hover:bg-white/10"
            data-testid="onboarding-skip"
          >
            Skip
          </Button>
        )}
      </div>

      <div
        ref={containerRef}
        className="flex-1 flex flex-col items-center justify-center px-6 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-full max-w-sm relative">
          {slides.map((slide, i) => (
            <div
              key={i}
              className={cn(
                "w-full flex flex-col items-center text-center transition-all duration-500 ease-out",
                i === current
                  ? "opacity-100 translate-x-0 relative"
                  : "opacity-0 absolute top-0 left-0 right-0 pointer-events-none",
                i < current && "-translate-x-full",
                i > current && "translate-x-full"
              )}
              aria-hidden={i !== current}
            >
              <div className="mb-8">
                {slide.content}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-tight">
                {slide.title}
              </h2>
              <p className="text-blue-200 text-base leading-relaxed max-w-xs">
                {slide.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 pb-6 space-y-6">
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === current
                  ? "w-8 bg-cyan-400"
                  : "w-2 bg-blue-700 hover:bg-blue-600"
              )}
            />
          ))}
        </div>

        {current === slides.length - 1 ? (
          <Button
            size="lg"
            onClick={finish}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-blue-950 font-bold text-base h-14 rounded-xl shadow-lg shadow-cyan-500/20"
            data-testid="onboarding-get-started"
          >
            Get Started
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={next}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold text-base h-14 rounded-xl border border-white/10"
            data-testid="onboarding-next"
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
