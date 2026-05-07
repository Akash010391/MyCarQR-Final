import PublicPage from "@/components/layout/public-page";
import { LegalPageView } from "@/components/legal-page-view";

export default function About() {
  return (
    <PublicPage>
      <LegalPageView slug="about" fallbackTitle="About MyCarQR" />
    </PublicPage>
  );
}
