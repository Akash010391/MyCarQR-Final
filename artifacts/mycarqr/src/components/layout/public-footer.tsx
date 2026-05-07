import { Link } from "wouter";
import { QrCode } from "lucide-react";

const productLinks = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/sign-up", label: "Get Started" },
];

const companyLinks = [
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

const legalLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/refund", label: "Refund Policy" },
  { href: "/shipping", label: "Shipping Policy" },
  { href: "/disclaimer", label: "Disclaimer" },
];

export default function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-background">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-sm">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
                <QrCode className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-foreground">MyCarQR</span>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Smart, privacy-first QR codes for every vehicle.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3 text-xs uppercase tracking-wide">Product</h4>
            <ul className="space-y-2">
              {productLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`footer-link-${l.href.replace(/\//g, "") || "home"}`}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3 text-xs uppercase tracking-wide">Company</h4>
            <ul className="space-y-2">
              {companyLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`footer-link-${l.href.replace(/\//g, "")}`}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3 text-xs uppercase tracking-wide">Legal</h4>
            <ul className="space-y-2">
              {legalLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`footer-link-${l.href.replace(/\//g, "")}`}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>© {year} MyCarQR. Made in India.</span>
          <span>Need help? <Link href="/contact" className="text-foreground hover:underline">Contact support</Link></span>
        </div>
      </div>
    </footer>
  );
}
