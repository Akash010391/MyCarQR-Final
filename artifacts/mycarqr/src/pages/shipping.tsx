import PublicPage from "@/components/layout/public-page";
import { LegalPageView } from "@/components/legal-page-view";

export default function Shipping() {
  return (
    <PublicPage>
      <LegalPageView slug="shipping" fallbackTitle="Shipping Policy" />
    </PublicPage>
  );
}
