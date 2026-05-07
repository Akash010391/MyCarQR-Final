import { Link, useLocation } from "wouter";
import { LayoutDashboard, Car, Bell, User } from "lucide-react";
import { useGetDashboardSummary } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/vehicles", label: "Vehicles", icon: Car },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
] as const;

interface BottomNavProps {
  hidden?: boolean;
}

export default function BottomNav({ hidden }: BottomNavProps) {
  const [location] = useLocation();
  const { data: summary } = useGetDashboardSummary();
  const unread = summary?.unreadAlerts ?? 0;

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-20 bg-background border-t border-border lg:hidden transition-transform duration-200",
        hidden && "translate-y-full pointer-events-none"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive =
            location === tab.href || location.startsWith(tab.href + "/");
          const showBadge = tab.href === "/alerts" && unread > 0;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-16 h-full relative transition-colors no-underline",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
              data-testid={`bottom-nav-${tab.label.toLowerCase()}`}
            >
              <div className="relative">
                <tab.icon
                  className={cn("w-5 h-5", isActive && "stroke-[2.5]")}
                />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] leading-tight",
                  isActive ? "font-semibold" : "font-medium"
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
