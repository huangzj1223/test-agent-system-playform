
"use client";
// FIXME  MC8yOmFIVnBZMlhwdTRUbGphRG1zWjg2ZGtwR2RRPT06YmU5MzBkYzQ=

import { MainLayout } from "@/components/layout/main-layout";
import { useLanguage } from "@/providers/LanguageProvider";

export default function FullstackAnalysisPage() {
  const { t } = useLanguage();

  return (
    <MainLayout title={t("nav.fullstackAnalysis")}>
      <div className="-m-6 h-full">
        <iframe
          src="/gitnexus-web/index.html"
          className="h-full w-full border-0"
          title={t("nav.fullstackAnalysis")}
          allow="fullscreen"
        />
      </div>
    </MainLayout>
  );
}
// FIXME  MS8yOmFIVnBZMlhwdTRUbGphRG1zWjg2ZGtwR2RRPT06YmU5MzBkYzQ=
