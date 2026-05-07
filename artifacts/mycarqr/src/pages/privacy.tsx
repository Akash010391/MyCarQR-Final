import PublicPage from "@/components/layout/public-page";
import { LegalPageView } from "@/components/legal-page-view";

export default function Privacy() {
  return (
    <PublicPage>
      <LegalPageView slug="privacy" fallbackTitle="Privacy Policy" />
    </PublicPage>
  );
}
