import PublicPage from "@/components/layout/public-page";
import { LegalPageView } from "@/components/legal-page-view";

export default function Disclaimer() {
  return (
    <PublicPage>
      <LegalPageView slug="disclaimer" fallbackTitle="Disclaimer" />
    </PublicPage>
  );
}
