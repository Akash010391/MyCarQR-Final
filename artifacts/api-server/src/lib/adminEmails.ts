import { clerkClient, getAuth } from "@clerk/express";
import type { Request } from "express";

/**
 * Admin email allowlist — these accounts always get admin access regardless of
 * the `is_admin` column in the users table. Acts as a safety fallback so the
 * project owner cannot get locked out of the admin panel.
 *
 * Add an email here OR set the ADMIN_EMAILS env var (comma-separated) to grant
 * persistent admin access.
 */
const STATIC_ADMIN_EMAILS = ["aakashkaishyap2@gmail.com"];

export function getAdminEmails(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const all = [...STATIC_ADMIN_EMAILS, ...fromEnv].map((e) => e.toLowerCase());
  return Array.from(new Set(all));
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

/**
 * Resolve the signed-in user's email for the current request.
 *
 * Tries the Clerk session claims first (cheap, no network), then falls back
 * to the Clerk Backend API (`clerkClient.users.getUser`) which always knows
 * the primary email — useful when the JWT template doesn't expose `email`.
 *
 * Returns lowercased email or null. Per-request memoised on `req` to avoid
 * repeated network calls inside the same request lifecycle.
 */
export async function getRequestEmail(req: Request): Promise<string | null> {
  const reqAny = req as Request & { _resolvedEmail?: string | null };
  if (reqAny._resolvedEmail !== undefined) return reqAny._resolvedEmail;

  let email: string | null = null;
  try {
    const auth = getAuth(req);
    const claimEmail = auth?.sessionClaims?.email as string | undefined;
    if (claimEmail) {
      email = claimEmail;
    } else if (auth?.userId) {
      const user = await clerkClient.users.getUser(auth.userId);
      const primary = user.emailAddresses?.find(
        (e) => e.id === user.primaryEmailAddressId,
      );
      email = primary?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress ?? null;
    }
  } catch {
    email = null;
  }

  reqAny._resolvedEmail = email ? email.toLowerCase() : null;
  return reqAny._resolvedEmail;
}
