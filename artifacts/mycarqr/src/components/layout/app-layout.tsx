import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import {
  LayoutDashboard, Car, Bell, FileText, CreditCard, User, Shield, LogOut, Menu, X, QrCode, Moon, Sun,
  AlertTriangle, KeyRound, HeartPulse, Package, ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetMe, useGetDashboardSummary, useGetAccidentReports, useGetLostItems } from "@workspace/api-client-react";
import { getTheme, setTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import BottomNav from "./bottom-nav";

const sidebarNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vehicles", label: "My Vehicles", icon: Car },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/accident-reports", label: "Accident Reports", icon: AlertTriangle },
  { href: "/lost-items", label: "Lost Key Returns", icon: KeyRound },
  { href: "/sos-profile", label: "SOS Profile", icon: HeartPulse },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/order-sticker", label: "Order Sticker", icon: Package },
  { href: "/my-orders", label: "My Orders", icon: ShoppingBag },
  { href: "/payment", label: "Upgrade Premium", icon: CreditCard },
  { href: "/profile", label: "Profile", icon: User },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(getTheme() === "dark");
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { data: me } = useGetMe();
  const { data: summary } = useGetDashboardSummary();
  const { data: accidentReports = [] } = useGetAccidentReports();
  const { data: lostItems = [] } = useGetLostItems();

  function toggleDark() {
    const next = dark ? "light" : "dark";
    setDark(!dark);
    setTheme(next);
  }

  const unread = summary?.unreadAlerts ?? 0;
  const unreadAccidents = accidentReports.filter((r) => !r.isRead).length;
  const unreadLost = lostItems.filter((i) => !i.isRead).length;

  function getBadge(href: string) {
    if (href === "/alerts") return unread;
    if (href === "/accident-reports") return unreadAccidents;
    if (href === "/lost-items") return unreadLost;
    return 0;
  }

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-40 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">MyCarQR</div>
              <div className="text-xs text-blue-300">Scan to Reach</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="text-blue-200 hover:text-white hover:bg-sidebar-accent lg:hidden h-8 w-8"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {me && (
          <div className="px-5 py-3 border-b border-sidebar-border">
            <Badge
              variant={me.plan === "premium" ? "default" : "secondary"}
              className={cn(
                "text-xs",
                me.plan === "premium"
                  ? "bg-cyan-500 text-blue-950 hover:bg-cyan-400"
                  : "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
            >
              {me.plan === "premium" ? "Premium" : "Free Plan"}
            </Badge>
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {sidebarNavItems.map((item) => {
            const active = location === item.href || location.startsWith(item.href + "/");
            const badge = getBadge(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  onClick={() => setSidebarOpen(false)}
                  data-testid={`nav-${item.href.slice(1)}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors relative",
                    active
                      ? "bg-sidebar-accent text-white"
                      : "text-blue-200 hover:bg-sidebar-accent/60 hover:text-white"
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                  {badge > 0 && (
                    <Badge className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0 min-w-0 h-5">
                      {badge}
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
          {me?.isAdmin && (
            <Link href="/admin">
              <div
                onClick={() => setSidebarOpen(false)}
                data-testid="nav-admin"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors",
                  location === "/admin"
                    ? "bg-sidebar-accent text-white"
                    : "text-blue-200 hover:bg-sidebar-accent/60 hover:text-white"
                )}
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </div>
            </Link>
          )}
        </nav>

        <div className="border-t border-sidebar-border px-4 py-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0]}
              </p>
              <p className="text-blue-300 text-xs truncate">
                {user?.emailAddresses?.[0]?.emailAddress}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDark}
              className="flex-1 text-blue-200 hover:text-white hover:bg-sidebar-accent"
              data-testid="button-theme-toggle"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ redirectUrl: "/" })}
              className="flex-1 text-blue-200 hover:text-white hover:bg-sidebar-accent"
              data-testid="button-sign-out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-3 border-b bg-background lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            data-testid="button-menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <QrCode className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">MyCarQR</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] lg:!pb-0">
          {children}
          <AppFooter />
        </main>

        <BottomNav hidden={sidebarOpen} />
      </div>
    </div>
  );
}

function AppFooter() {
  const links = [
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
    { href: "/refund", label: "Refund" },
    { href: "/shipping", label: "Shipping" },
    { href: "/disclaimer", label: "Disclaimer" },
  ];
  return (
    <footer className="border-t mt-12 px-4 py-6 text-xs text-muted-foreground">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <span>&copy; {new Date().getFullYear()} MyCarQR — Made in India</span>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hover:text-foreground transition-colors"
              data-testid={`app-footer-${l.label.toLowerCase()}`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
