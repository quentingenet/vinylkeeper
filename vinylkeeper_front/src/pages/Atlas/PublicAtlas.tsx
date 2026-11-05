import Atlas from "@pages/Atlas/Atlas";
import PublicPage from "@components/Layout/PublicPage";
import { usePageMeta } from "@hooks/usePageMeta";
import { EGlobalUrls } from "@utils/GlobalUrls";

/** The Vinyl Atlas for visitors: read only. */
export default function PublicAtlas() {
  usePageMeta({
    title: "Vinyl Atlas: record shops, flea markets and vinyl spots | Vinyl Keeper",
    description:
      "Find record shops, flea markets and vinyl spots around the world on the Vinyl Atlas, a free community map shared by vinyl collectors.",
    canonicalPath: EGlobalUrls.ATLAS,
  });

  return (
    <PublicPage>
      <Atlas isPublic />
    </PublicPage>
  );
}
