import { useCallback, useEffect } from "react";
import { useSignIn, useSignUp } from "@clerk/clerk-react";
import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

const DEEP_LINK_SCHEME = "com.mycarqr.app://oauth-callback";
const CLERK_REDIRECT_URL = DEEP_LINK_SCHEME;

export function useGoogleAuth() {
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener("appUrlOpen", async ({ url }) => {
      if (!url.startsWith(DEEP_LINK_SCHEME)) return;

      await Browser.close();

      if (!signInLoaded || !signUpLoaded) return;

      try {
        const result = await signIn!.handleRedirectCallback();

        if (result.status === "complete") {
          await setSignInActive!({ session: result.createdSessionId });
          return;
        }

        if (
          result.status === "needs_identifier" ||
          result.firstFactorVerification.status === "transferable"
        ) {
          await signUp!.create({ transfer: true });
          const su = await signUp!.update({});
          if (su.status === "complete") {
            await setSignUpActive!({ session: su.createdSessionId! });
          }
        }
      } catch (err) {
        console.error("[useGoogleAuth] handleRedirectCallback error:", err);
      }
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, [signIn, signUp, signInLoaded, signUpLoaded, setSignInActive, setSignUpActive]);

  const signInWithGoogle = useCallback(async () => {
    if (!signInLoaded) return;

    try {
      const oauthResult = await signIn!.create({
        strategy: "oauth_google",
        redirectUrl: CLERK_REDIRECT_URL,
        actionCompleteRedirectUrl: CLERK_REDIRECT_URL,
      });

      const googleAuthUrl =
        oauthResult.firstFactorVerification.externalVerificationRedirectURL?.toString();

      if (!googleAuthUrl) {
        throw new Error("Clerk did not return a Google OAuth URL.");
      }

      if (Capacitor.isNativePlatform()) {
        await Browser.open({
          url: googleAuthUrl,
          presentationStyle: "popover",
          windowName: "_blank",
        });
      } else {
        window.location.href = googleAuthUrl;
      }
    } catch (err) {
      console.error("[useGoogleAuth] signInWithGoogle error:", err);
      throw err;
    }
  }, [signIn, signInLoaded]);

  return { signInWithGoogle };
}
