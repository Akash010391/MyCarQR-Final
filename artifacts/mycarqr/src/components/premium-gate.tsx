import { useState, useCallback } from "react";
import { Link } from "wouter";
import { Lock, Star, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetMe } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { isNativePlatform } from "@/lib/capacitor";
import { isBillingAvailable, purchasePremium } from "@/lib/billing";
import { queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface PremiumGateProps {
  children: React.ReactNode;
  featureName: string;
  description?: string;
}

const premiumFeatures = [
  "Multiple vehicles",
  "Custom QR sticker designs",
  "Accident Witness Mode",
  "SOS Emergency Profile",
  "Lost Key / Found Item Mode",
  "Full scan history",
  "Document expiry reminders",
  "Priority alerts",
  "Privacy mode",
];

export function PremiumGate({ children, featureName, description }: PremiumGateProps) {
  const { data: me, isLoading } = useGetMe();
  const { toast } = useToast();
  const [purchasing, setPurchasing] = useState(false);
  const billingReady = isBillingAvailable();

  const handlePurchase = useCallback(async () => {
    setPurchasing(true);
    try {
      const result = await purchasePremium();
      if (result.success) {
        toast({ title: "Purchase successful!", description: "Your Premium plan is now active." });
        queryClient.invalidateQueries({ queryKey: ["getMe"] });
      } else if (result.error === "cancelled") {
        toast({ title: "Purchase cancelled", description: "No charges were made." });
      } else {
        toast({ title: "Purchase failed", description: result.error || "Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setPurchasing(false);
    }
  }, [toast]);

  if (isLoading) return null;

  if (me?.plan === "premium") {
    return <>{children}</>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto mt-8">
      <Card className="border-2 border-primary/20 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <Badge className="mb-3 bg-primary/20 text-primary border-primary/30">Premium Feature</Badge>
          <h2 className="text-xl font-bold mb-2">{featureName}</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {description ?? "This feature is available on the Premium plan. Upgrade to unlock it along with all other premium features."}
          </p>

          <div className="grid grid-cols-1 gap-1.5 mb-6 text-left">
            {premiumFeatures.map(f => (
              <div key={f} className="flex items-center gap-2 text-sm">
                <Star className="w-3.5 h-3.5 text-primary shrink-0" />
                {f}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {billingReady ? (
              <Button
                className="flex-1 gap-2"
                onClick={handlePurchase}
                disabled={purchasing}
              >
                {purchasing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Subscribe — ₹99/month
                  </>
                )}
              </Button>
            ) : (
              <Link href="/pricing" className="flex-1">
                <Button className="w-full gap-2">
                  <Zap className="w-4 h-4" />
                  Upgrade — from ₹99/month
                </Button>
              </Link>
            )}
            <Link href="/pricing">
              <Button variant="outline" className="w-full sm:w-auto">View Plans</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
}

export function UpgradeModal({ open, onOpenChange, featureName }: UpgradeModalProps) {
  const { toast } = useToast();
  const [purchasing, setPurchasing] = useState(false);
  const billingReady = isBillingAvailable();

  const handlePurchase = useCallback(async () => {
    setPurchasing(true);
    try {
      const result = await purchasePremium();
      if (result.success) {
        toast({ title: "Purchase successful!", description: "Your Premium plan is now active." });
        queryClient.invalidateQueries({ queryKey: ["getMe"] });
        onOpenChange(false);
      } else if (result.error === "cancelled") {
        toast({ title: "Purchase cancelled", description: "No charges were made." });
      } else {
        toast({ title: "Purchase failed", description: result.error || "Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setPurchasing(false);
    }
  }, [toast, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle>Upgrade to Premium</DialogTitle>
          <DialogDescription>
            <strong>{featureName}</strong> is a Premium feature. Unlock it along with unlimited vehicles, custom QR designs, SOS profiles, and more.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-2">
          {billingReady ? (
            <Button
              className="w-full gap-2"
              onClick={handlePurchase}
              disabled={purchasing}
            >
              {purchasing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Subscribe — ₹99/month
                </>
              )}
            </Button>
          ) : (
            <Link href="/pricing" onClick={() => onOpenChange(false)}>
              <Button className="w-full gap-2">
                <Zap className="w-4 h-4" />
                View Plans — from ₹99/month
              </Button>
            </Link>
          )}
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
