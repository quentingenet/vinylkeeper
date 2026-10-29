import { useState } from "react";
import { Box, GlobalStyles } from "@mui/material";
import Atlas from "@pages/Atlas/Atlas";
import PublicAtlasHeader from "@components/Atlas/PublicAtlasHeader";
import Footer from "@components/Footer/Footer";
import { usePageMeta } from "@hooks/usePageMeta";
import { EGlobalUrls } from "@utils/GlobalUrls";

/** The Vinyl Atlas for visitors: read only, between the bar and the footer of the home page. */
export default function PublicAtlas() {
  usePageMeta({
    title: "Vinyl Atlas: record shops, flea markets and vinyl spots | Vinyl Keeper",
    description:
      "Find record shops, flea markets and vinyl spots around the world on the Vinyl Atlas, a free community map shared by vinyl collectors.",
    canonicalPath: EGlobalUrls.ATLAS,
  });
  const [openTermsModal, setOpenTermsModal] = useState(false);
  const [openFounderModal, setOpenFounderModal] = useState(false);

  return (
    // Exactly the height of the screen: the bar, then the Atlas filling the rest (room for the
    // footer, fixed at the bottom, included), so the page never scrolls for nothing
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* The app has no CssBaseline: the default 8px margin of the body would add a scrollbar
          to a page of exactly the screen height. Removed only while this page is shown. */}
      <GlobalStyles styles={{ body: { margin: 0 } }} />
      <PublicAtlasHeader />
      <Atlas isPublic />
      <Footer
        setOpenTermsModal={setOpenTermsModal}
        openTermsModal={openTermsModal}
        setOpenFounderModal={setOpenFounderModal}
        openFounderModal={openFounderModal}
      />
    </Box>
  );
}
