import PublicPage from "@/components/layout/public-page";
import { LegalPageView } from "@/components/legal-page-view";

export default function Terms() {
  return (
    <PublicPage>
      <LegalPageView slug="terms" fallbackTitle="Terms & Conditions" />
    </PublicPage>
  );
}
