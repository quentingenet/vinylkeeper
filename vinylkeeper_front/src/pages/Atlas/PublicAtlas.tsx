import Atlas from "@pages/Atlas/Atlas";
import PublicPage from "@components/Layout/PublicPage";
import { usePageMeta } from "@hooks/usePageMeta";
import { EGlobalUrls } from "@utils/GlobalUrls";
import { useTranslation } from "react-i18next";

/** The Vinyl Atlas for visitors: read only. */
export default function PublicAtlas() {
  const { t } = useTranslation("atlas");
  usePageMeta({
    title: t("public.metaTitle"),
    description:
      t("public.metaDescription"),
    canonicalPath: EGlobalUrls.ATLAS,
  });

  return (
    <PublicPage>
      <Atlas isPublic />
    </PublicPage>
  );
}
