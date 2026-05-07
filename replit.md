# MyCarQR Workspace

## Overview

MyCarQR is a full-stack web application designed to help car owners generate smart QR codes for their vehicles. This allows anyone to contact them regarding parking issues or other concerns without revealing personal contact details. The project aims to provide a secure and efficient communication channel between the public and car owners, enhancing convenience and safety in urban environments. It includes features for vehicle management, emergency profiles, accident reporting, lost item reporting, and a comprehensive admin panel for system management.

## User Preferences

I prefer to communicate in a clear and concise manner. When explaining technical concepts, please provide sufficient detail for a thorough understanding without overcomplicating the language. I value iterative development and would like to be consulted before any major architectural changes or significant feature implementations. I appreciate explanations that highlight the "why" behind decisions, not just the "what."

## System Architecture

MyCarQR is built as a pnpm monorepo using TypeScript. The architecture comprises a React + Vite frontend with Tailwind CSS v4, shadcn/ui, Wouter, and TanStack Query, and an Express 5 API server. Data persistence is handled by PostgreSQL with Drizzle ORM. Authentication is managed via Clerk. Zod is used for validation, and Orval generates API clients from an OpenAPI specification. The frontend is wrapped in a Capacitor-based Android application for mobile access.

### UI/UX Decisions

- **Color Scheme**: Adaptive icons for the Android app use brand colors (`#1a3a6e`).
- **Theming**: Dark/light mode toggle available. Premium QR sticker designs offer 8 themes (e.g., Midnight Carbon, Light Premium, Racing Red, Electric Blue).
- **Layout**: Public-facing pages (e.g., legal, contact) utilize a shared `PublicFooter` and are rendered via `react-markdown` from DB-backed content. The main application uses `AppLayout` with a bottom navigation bar on mobile (Home, Vehicles, Alerts, Profile) and a full sidebar on desktop. The hamburger menu is retained for accessing secondary pages (Documents, Orders, SOS, Accident Reports, etc.). Bottom nav uses safe area padding for phones with gesture navigation.
- **Onboarding**: 3-screen swipeable onboarding flow (`/onboarding`) shown on first launch (persisted via `localStorage` key `mycarqr_onboarding_done`). Screens: "Your Car's Digital Identity", "Scan. Alert. Connect.", "Complete Car Protection". Skip button, dot indicators, Next/Get Started CTA. After completion redirects to `/sign-up`. Already-onboarded users visiting `/onboarding` are redirected to `/`.
- **Dashboard**: Greeting and Add Vehicle button on separate rows (prevents mobile overlap). Stat cards show contextual empty states. Safety Score shows "—" for users with no vehicles or accounts less than 7 days old. "Complete your profile" banner appears when user has no phone number (via Clerk `user.phoneNumbers`), gated on `isLoaded` to avoid flash.
- **Design System**: Leverages shadcn/ui for consistent UI components and Tailwind CSS for styling.

### Technical Implementations

- **Monorepo Structure**: Organized using pnpm workspaces, including `api-spec`, `api-zod`, `api-client-react`, and `db` packages.
- **API**: Express.js handles API requests, with routes for user management, vehicle operations, payments, and admin functions.
- **Database Schema**: Key tables include `users`, `vehicles`, `scan_alerts`, `vehicle_documents`, `sos_profiles`, `accident_reports`, `lost_items`, `payment_settings`, `payment_requests`, `qr_settings`, `sticker_orders`, `contact_messages`, `legal_pages`, `faqs`, `testimonials`, `support_tickets`, `notification_preferences`, and `push_tokens`.
- **QR Code Generation**: Uses the `qrcode` npm package for generating QR codes, with support for ECL-H and centered logo overlays. Print-ready sticker PDFs are generated dynamically.
- **Image Handling**: Accident report and lost item photos are stored in Replit App Storage (Google Cloud Storage) as object paths, not base64. Image uploads are compressed client-side and validated server-side.
- **Admin Panel**: An enhanced admin panel with 10+ tabs provides comprehensive control over users, payments, orders, content, and system settings. Access is gated by `is_admin` flag or email allowlist.
- **Payment Workflow**: Supports UPI payments with screenshot uploads and an admin review/approval process for premium upgrades. Sticker orders use UPI deep links (`upi://pay?...`) to launch Google Pay/PhonePe/Paytm directly on Android via Capacitor. Each order gets a unique order code (MQR-timestamp-random). Orders are saved with `pending_verification` status; admin verifies and marks as paid/shipped with tracking number. On web (non-Capacitor), UPI intent button is hidden; instead a manual payment fallback shows the UPI ID and QR code with instructions to pay from a phone app.
- **Google Play Billing**: In-app subscription via `cordova-plugin-purchase` (CdvPurchase). Product ID: `premium_monthly` (₹99/month). Client-side billing service at `artifacts/mycarqr/src/lib/billing.ts` handles init, purchase, restore, and verified-purchase callbacks. Backend verification at `POST /api/verify-purchase` verifies purchase tokens with Google Play Developer API (requires `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` env secret; falls back to trusting client receipt if not set). On native Android, pricing page shows "Subscribe via Google Play" button with loading states and restore purchases option. On web, falls back to existing UPI payment flow. Billing initializes automatically on app start for native platforms via `capacitor.ts`.
- **Mobile Application**: The web app is packaged into a native Android application using Capacitor, including custom icons, splash screens, and deep linking for `mycarqr://` and `https://mycarqr.replit.app/scan/*` URLs. Android build configured for signed release AAB: `build.gradle` reads signing from `keystore.properties`, target SDK 34, min SDK 24. Permissions: INTERNET, POST_NOTIFICATIONS, CAMERA (with `required="false"` feature flags).
- **Push Notifications (FCM)**: Firebase Cloud Messaging integration via `@capacitor/push-notifications` (client) and `firebase-admin` (server). Push tokens are saved to `push_tokens` table (unique per user+token). Notifications fire on: QR scan alerts, accident reports, lost item reports. Document expiry reminders (7-day and 1-day) via admin-only `/api/check-document-expiry` endpoint. Token registration is auth-aware (syncs on sign-in, deregisters on sign-out). Tap navigation routes to the relevant screen. Requires `FIREBASE_SERVICE_ACCOUNT_JSON` env secret and `google-services.json` in `artifacts/mycarqr/android/app/`.
- **Content Management**: Legal pages, FAQs, and testimonials are DB-backed and editable via the admin panel, with default content fallback.
- **User Profile**: Custom profile dashboard (replaces Clerk's `<UserProfile />`). Tabbed settings hub (Account, Vehicles, Subscription, Orders, Notifications, Emergency, Help, Settings). Account tab shows profile photo (Clerk `user.setProfileImage`), inline-editable display name and phone (stored in `users.display_name` / `users.phone` DB columns via `PUT /api/me`), plan badge, quick-access links, and sign-out button. Includes a "Danger Zone" for account deletion.

## External Dependencies

- **Authentication**: Clerk (Replit-managed, via proxy)
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API Codegen**: Orval (from OpenAPI spec) — generated client uses `customFetch` with `credentials: "include"` for cookie-based Clerk auth
- **Frontend Framework**: React
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Routing**: Wouter
- **State Management/Data Fetching**: TanStack Query
- **Mobile Wrapper**: Capacitor (Android)
- **In-App Purchases**: `cordova-plugin-purchase` (Google Play Billing)
- **Push Notifications**: Firebase Admin SDK (`firebase-admin`), `@capacitor/push-notifications`
- **QR Generation Library**: `qrcode` npm package
- **Object Storage**: Replit App Storage (Google Cloud Storage) for image uploads
- **Server**: Express 5