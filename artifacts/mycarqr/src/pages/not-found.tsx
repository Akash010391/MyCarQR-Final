import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
          <QrCode className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold">404</h1>
        <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
        <Link href="/">
          <Button data-testid="button-go-home">Go Home</Button>
        </Link>
      </div>
    </div>
  );
}
