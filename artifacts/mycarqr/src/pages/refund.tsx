import PublicPage from "@/components/layout/public-page";
import { LegalPageView } from "@/components/legal-page-view";

export default function Refund() {
  return (
    <PublicPage>
      <LegalPageView slug="refund" fallbackTitle="Refund Policy" />
    </PublicPage>
  );
}
