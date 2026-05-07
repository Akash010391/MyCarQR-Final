import { Link } from "wouter";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/react";
import PublicFooter from "./public-footer";

interface PublicPageProps {
  children: React.ReactNode;
  title?: string;
}

export default function PublicPage({ children }: PublicPageProps) {
  const { isSignedIn } = useUser();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
                <QrCode className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm">MyCarQR</span>
            </div>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/pricing">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm">Pricing</Button>
            </Link>
            <Link href="/contact">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm hidden sm:inline-flex">Contact</Button>
            </Link>
            {isSignedIn ? (
              <Link href="/dashboard">
                <Button size="sm" className="text-xs sm:text-sm" data-testid="public-cta-dashboard">Dashboard</Button>
              </Link>
            ) : (
              <Link href="/sign-in">
                <Button size="sm" className="text-xs sm:text-sm" data-testid="public-cta-signin">Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
