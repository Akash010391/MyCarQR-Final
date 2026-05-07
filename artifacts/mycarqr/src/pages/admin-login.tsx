import { useUser } from "@clerk/react";
import { Shield, Lock, ArrowRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function AdminLogin() {
  const { isSignedIn, isLoaded } = useUser();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate("/admin");
    }
  }, [isLoaded, isSignedIn, navigate]);

  function handleSignIn() {
    navigate("/sign-in");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">MyCarQR Admin</h1>
          <p className="text-muted-foreground text-sm">Restricted access — authorised personnel only</p>
        </div>

        <Card className="border shadow-md">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                This panel is for platform administrators only. Sign in with your admin account to continue.
              </p>
            </div>

            <Button className="w-full gap-2" onClick={handleSignIn}>
              <LogIn className="w-4 h-4" />
              Sign in to Admin Panel
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Not an admin?{" "}
              <button
                className="underline underline-offset-2 hover:text-foreground transition-colors"
                onClick={() => navigate("/")}
              >
                Go to MyCarQR
              </button>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground">
          Access is logged. Unauthorised access attempts will be reported.
        </p>
      </div>
    </div>
  );
}
