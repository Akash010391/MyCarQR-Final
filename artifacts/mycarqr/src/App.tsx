import { useEffect, useRef, useState } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { initTheme } from "@/lib/theme";
import { initCapacitor, isNativePlatform } from "@/lib/capacitor";
import { getPendingPushToken, clearPendingPushToken } from "@/lib/pushNotifications";
import { registerPushToken, deletePushToken, setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
setBaseUrl(import.meta.env.VITE_API_URL ?? "https://mycarqr-final-backend.onrender.com");
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Vehicles from "@/pages/vehicles";
import AddVehicle from "@/pages/add-vehicle";
import VehicleDetail from "@/pages/vehicle-detail";
import EditVehicle from "@/pages/edit-vehicle";
import Alerts from "@/pages/alerts";
import Documents from "@/pages/documents";
import Pricing from "@/pages/pricing";
import Profile from "@/pages/profile";
import Admin from "@/pages/admin";
import ScanPage from "@/pages/scan";
import QrStudio from "@/pages/qr-studio";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import About from "@/pages/about";
import Contact from "@/pages/contact";
import Refund from "@/pages/refund";
import Shipping from "@/pages/shipping";
import Disclaimer from "@/pages/disclaimer";
import SosProfile from "@/pages/sos-profile";
import AccidentReports from "@/pages/accident-reports";
import LostItems from "@/pages/lost-items";
import Payment from "@/pages/payment";
import AdminLogin from "@/pages/admin-login";
import OrderSticker from "@/pages/order-sticker";
import MyOrders from "@/pages/my-orders";
import AppLayout from "@/components/layout/app-layout";
import Onboarding, { hasSeenOnboarding } from "@/pages/onboarding";

initTheme();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#1a3a6e",
    colorForeground: "#0f172a",
    colorMutedForeground: "#64748b",
    colorDanger: "#ef4444",
    colorBackground: "#ffffff",
    colorInput: "#f1f5f9",
    colorInputForeground: "#0f172a",
    colorNeutral: "#cbd5e1",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.625rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white dark:bg-slate-900 rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl border border-slate-200 dark:border-slate-700",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-slate-900 font-bold text-2xl",
    headerSubtitle: "text-slate-500",
    socialButtonsBlockButtonText: "text-slate-700 font-medium",
    formFieldLabel: "text-slate-700 font-medium text-sm",
    footerActionLink: "text-blue-700 font-semibold hover:text-blue-800",
    footerActionText: "text-slate-500",
    dividerText: "text-slate-400",
    identityPreviewEditButton: "text-blue-700",
    formFieldSuccessText: "text-green-600",
    alertText: "text-red-600",
    logoBox: "flex justify-center",
    logoImage: "h-10 w-10",
    socialButtonsBlockButton: "border border-slate-200 bg-white hover:bg-slate-50 rounded-lg",
    formButtonPrimary: "bg-blue-800 hover:bg-blue-900 text-white rounded-lg font-semibold",
    formFieldInput: "bg-slate-50 border border-slate-200 rounded-lg text-slate-900",
    footerAction: "bg-slate-50 border-t border-slate-100",
    dividerLine: "bg-slate-200",
    alert: "bg-red-50 border border-red-200 rounded-lg",
    otpCodeFieldInput: "border border-slate-200 rounded-lg",
    formFieldRow: "gap-2",
    main: "px-6 py-4",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Welcome back</h1>
          <p className="text-blue-200 mt-2">Sign in to manage your vehicles</p>
        </div>
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Create account</h1>
          <p className="text-blue-200 mt-2">Join MyCarQR — your vehicle's smart identity</p>
        </div>
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      </div>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener]);

  return null;
}

function PushTokenSync() {
  const { isSignedIn } = useUser();
  const registeredTokenRef = useRef<string | null>(null);
  useEffect(() => {
    setAuthTokenGetter(async () => {
      const token = await (window as any).Clerk?.session?.getToken();
      return token ?? null;
    });
  }, []);

  useEffect(() => {
    if (!isNativePlatform()) return undefined;

    if (isSignedIn) {
      const token = getPendingPushToken();
      if (token && token !== registeredTokenRef.current) {
        registerPushToken({ token, platform: "android" })
          .then(() => {
            registeredTokenRef.current = token;
            clearPendingPushToken();
          })
          .catch((err) => console.error("Failed to register push token:", err));
      } else if (!token && !registeredTokenRef.current) {
        const interval = setInterval(() => {
          const t = getPendingPushToken();
          if (t) {
            clearInterval(interval);
            registerPushToken({ token: t, platform: "android" })
              .then(() => {
                registeredTokenRef.current = t;
                clearPendingPushToken();
              })
              .catch((err) => console.error("Failed to register push token:", err));
          }
        }, 2000);
        return () => clearInterval(interval);
      }
    } else if (!isSignedIn && registeredTokenRef.current) {
      const token = registeredTokenRef.current;
      deletePushToken({ token }).catch(() => {});
      registeredTokenRef.current = null;
    }
    return undefined;
  }, [isSignedIn]);

  return null;
}

function HomeRedirect() {
  const onboardingSeen = hasSeenOnboarding();
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        {onboardingSeen ? <Landing /> : <Redirect to="/onboarding" />}
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <AppLayout>
          <Component />
        </AppLayout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    initCapacitor(setLocation).then((fn) => {
      cleanup = fn;
    });
    return () => {
      cleanup?.();
    };
  }, [setLocation]);

  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={{
        signIn: { start: { title: "Sign in to MyCarQR", subtitle: "Welcome back! Please sign in to continue" } },
        signUp: { start: { title: "Create your MyCarQR account", subtitle: "Welcome! Fill in your details to get started" } },
      }}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <PushTokenSync />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/onboarding" component={Onboarding} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/scan/:qrCode" component={ScanPage} />
            <Route path="/pricing" component={Pricing} />
            <Route path="/privacy" component={Privacy} />
            <Route path="/terms" component={Terms} />
            <Route path="/about" component={About} />
            <Route path="/contact" component={Contact} />
            <Route path="/refund" component={Refund} />
            <Route path="/shipping" component={Shipping} />
            <Route path="/disclaimer" component={Disclaimer} />
            <Route path="/dashboard">
              {() => <ProtectedRoute component={Dashboard} />}
            </Route>
            <Route path="/vehicles/add">
              {() => <ProtectedRoute component={AddVehicle} />}
            </Route>
            <Route path="/vehicles/:id/qr-studio">
              {() => <ProtectedRoute component={QrStudio} />}
            </Route>
            <Route path="/vehicles/:id/edit">
              {() => <ProtectedRoute component={EditVehicle} />}
            </Route>
            <Route path="/vehicles/:id">
              {() => <ProtectedRoute component={VehicleDetail} />}
            </Route>
            <Route path="/vehicles">
              {() => <ProtectedRoute component={Vehicles} />}
            </Route>
            <Route path="/alerts">
              {() => <ProtectedRoute component={Alerts} />}
            </Route>
            <Route path="/accident-reports">
              {() => <ProtectedRoute component={AccidentReports} />}
            </Route>
            <Route path="/lost-items">
              {() => <ProtectedRoute component={LostItems} />}
            </Route>
            <Route path="/sos-profile">
              {() => <ProtectedRoute component={SosProfile} />}
            </Route>
            <Route path="/documents">
              {() => <ProtectedRoute component={Documents} />}
            </Route>
            <Route path="/profile">
              {() => <ProtectedRoute component={Profile} />}
            </Route>
            <Route path="/payment">
              {() => <ProtectedRoute component={Payment} />}
            </Route>
            <Route path="/order-sticker">
              {() => <ProtectedRoute component={OrderSticker} />}
            </Route>
            <Route path="/my-orders">
              {() => <ProtectedRoute component={MyOrders} />}
            </Route>
            <Route path="/admin">
              {() => <ProtectedRoute component={Admin} />}
            </Route>
            <Route path="/admin-login">
              {() => <AdminLogin />}
            </Route>
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
