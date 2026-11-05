import { useState, type ReactNode } from "react";
import { Box, GlobalStyles } from "@mui/material";
import PublicHeader from "@components/Layout/PublicHeader";
import Footer from "@components/Footer/Footer";

interface PublicPageProps {
  children: ReactNode;
  /** The page to come back to once logged in */
  nextPath?: string;
}

/** A page of the app open to visitors: between the bar and the footer of the home page. */
export default function PublicPage({ children, nextPath }: PublicPageProps) {
  const [openTermsModal, setOpenTermsModal] = useState(false);
  const [openFounderModal, setOpenFounderModal] = useState(false);

  return (
    // Exactly the height of the screen: the bar, then the page filling the rest (room for the
    // footer, fixed at the bottom, included), so the page never scrolls for nothing
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* The app has no CssBaseline: the default 8px margin of the body would add a scrollbar
          to a page of exactly the screen height. Removed only while this page is shown. */}
      <GlobalStyles styles={{ body: { margin: 0 } }} />
      <PublicHeader nextPath={nextPath} />
      {children}
      <Footer
        setOpenTermsModal={setOpenTermsModal}
        openTermsModal={openTermsModal}
        setOpenFounderModal={setOpenFounderModal}
        openFounderModal={openFounderModal}
      />
    </Box>
  );
}
