export type LegalSlug = "about" | "privacy" | "terms" | "refund" | "shipping" | "disclaimer";

export interface LegalDefault {
  slug: LegalSlug;
  title: string;
  content: string;
}

export const DEFAULT_LEGAL_CONTENT: Record<LegalSlug, LegalDefault> = {
  about: {
    slug: "about",
    title: "About MyCarQR",
    content: `MyCarQR is a smart vehicle QR safety and communication platform designed to help vehicle owners stay reachable without publicly sharing their personal phone number.

With MyCarQR, every car, bike, or scooter can have a unique QR code. When someone scans the QR, they can contact the vehicle owner, report an accident, return lost keys or items, or access emergency information if the owner has enabled it.

Our mission is to make vehicle communication safer, faster, and more convenient for Indian vehicle owners.

MyCarQR is built for car owners, bike owners, apartment parking users, office parking users, families, and fleet owners who want a simple and modern way to stay connected around their vehicle.`,
  },
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    content: `MyCarQR respects your privacy. We collect only the information required to provide our vehicle QR safety and communication services.

Information we may collect includes your name, phone number, email address, vehicle details, QR scan activity, payment information, uploaded images, emergency profile details if added by you, and approximate location only when permission is allowed.

We use this information to generate your vehicle QR code, enable communication between scanner and vehicle owner, send alerts, manage premium subscriptions, process sticker orders, improve app security, and provide customer support.

We do not sell your personal data to third parties.

Your phone number is not intended to be publicly displayed unless you choose to show it. Communication features are designed to protect owner privacy as much as possible.

Location information is collected only when permission is granted by the user or scanner.

Uploaded images in accident reports or lost item reports are used only for reporting and safety purposes.

Users can request account deletion or data removal by contacting support.`,
  },
  terms: {
    slug: "terms",
    title: "Terms & Conditions",
    content: `By using MyCarQR, you agree to use the platform responsibly and legally.

MyCarQR provides QR-based vehicle communication, safety reporting, emergency profile access, lost item return support, subscription features, and sticker-related services.

Users are responsible for providing accurate account, vehicle, emergency, and contact information.

Users must not misuse MyCarQR for fake reports, harassment, spam, illegal activity, or unauthorized access.

Vehicle owners are responsible for where and how they place their QR sticker.

MyCarQR does not guarantee prevention of accidents, theft, damage, towing, or parking disputes. The platform only helps improve communication and reporting.

Premium features are available based on the selected plan and payment approval.

MyCarQR may suspend or restrict accounts involved in misuse, fraud, abuse, or violation of these terms.`,
  },
  refund: {
    slug: "refund",
    title: "Refund & Cancellation Policy",
    content: `MyCarQR offers digital subscription plans and physical QR sticker products.

For manual UPI subscription payments, premium access is activated only after admin verification and approval.

Once premium access is activated, subscription fees are generally non-refundable unless there is a duplicate payment, failed activation, or genuine technical issue confirmed by our team.

For physical sticker orders, refund or replacement may be considered only if the order is not processed, damaged during delivery, incorrectly printed, or not delivered within a reasonable time.

Users can contact support with payment proof, order details, and issue description.

Approved refunds will be processed through the original or mutually agreed payment method.`,
  },
  shipping: {
    slug: "shipping",
    title: "Shipping Policy",
    content: `MyCarQR may offer physical QR stickers for cars, bikes, and other vehicles.

After successful payment and order confirmation, sticker orders are processed for printing and dispatch.

Estimated processing time: 2 to 5 working days.

Estimated delivery time may vary depending on location, courier service, and availability.

Order status may show: Pending, Printed, Shipped, and Delivered.

Tracking details will be provided when available.

Users must provide correct name, phone number, address, city, state, and pincode. MyCarQR is not responsible for delays caused by incorrect delivery information.`,
  },
  disclaimer: {
    slug: "disclaimer",
    title: "Disclaimer",
    content: `MyCarQR is a vehicle communication and safety support platform.

MyCarQR does not guarantee prevention of accidents, theft, damage, towing, wrong parking, or emergency situations.

Information submitted through accident reports, lost item reports, scan alerts, or emergency features is provided by users or scanners. MyCarQR is not responsible for false, incorrect, misleading, or abusive reports.

Emergency profile information is shown only if enabled by the vehicle owner. Users are responsible for keeping this information accurate.

MyCarQR is not a government, police, medical, insurance, or emergency response service.

Users should contact the appropriate authorities in serious accidents, medical emergencies, theft, legal disputes, or unsafe situations.`,
  },
};

export const ALLOWED_LEGAL_SLUGS = Object.keys(DEFAULT_LEGAL_CONTENT) as LegalSlug[];

export function isAllowedLegalSlug(s: string): s is LegalSlug {
  return (ALLOWED_LEGAL_SLUGS as readonly string[]).includes(s);
}
