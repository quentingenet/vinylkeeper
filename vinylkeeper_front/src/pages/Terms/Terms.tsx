import { Box, Link, Typography } from "@mui/material";
import PublicPage from "@components/Layout/PublicPage";
import { CONTACT_EMAIL, TermsContent } from "@components/Modals/ModalTermsVinylKeeper";
import { useDocumentTitle } from "@hooks/useDocumentTitle";
import { colors } from "@styles/colors";

/** Anchor of the account deletion instructions: the address to give to the app stores. */
export const DELETE_ACCOUNT_ANCHOR = "delete-account";

const linkProps = { color: "inherit", underline: "always", sx: { fontWeight: 600 } } as const;

/**
 * The terms of use and the privacy notice on a page of their own, open to everyone: the app stores ask for
 * an address for them, and for the way to delete an account. `standalone` adds the bar and the footer of the
 * home page, for a visitor; a member already has the menu of the app around it.
 */
export default function Terms({ standalone = false }: { standalone?: boolean }) {
  useDocumentTitle("Terms of use and privacy | Vinyl Keeper");

  const page = (
    <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center", p: { xs: 1, sm: 3 }, pb: { xs: 10, sm: 12 } }}>
      <Box
        component="article"
        sx={{
          width: "100%",
          maxWidth: 860,
          bgcolor: colors.offWhite,
          color: "black",
          border: `2px solid ${colors.black}`,
          p: { xs: 2, sm: 4 },
          alignSelf: "flex-start",
        }}
      >
        <Typography variant="h4" component="h1" sx={{ color: "black", textAlign: "center" }}>
          Vinyl Keeper: terms of use and privacy
        </Typography>

        <Box component="section" id={DELETE_ACCOUNT_ANCHOR} sx={{ mt: 3, p: 2, border: `1px solid ${colors.black}` }}>
          <Typography component="h2" sx={{ color: "black", fontWeight: 700 }}>
            Delete your account
          </Typography>
          <Typography variant="body2" sx={{ color: "black", mt: 0.75 }}>
            In the app or on vinylkeeper.org: log in, open Settings, then &ldquo;Danger zone&rdquo; and &ldquo;Delete
            account&rdquo;, type DELETE and confirm. The deletion is permanent.
          </Typography>
          <Typography variant="body2" sx={{ color: "black", mt: 0.75 }}>
            If you cannot log in, write to{" "}
            <Link {...linkProps} href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </Link>{" "}
            from the email address of the account, asking for its deletion.
          </Typography>
          <Typography variant="body2" sx={{ color: "black", mt: 0.75 }}>
            What is deleted, and what is kept, is told in section 7.6 below.
          </Typography>
        </Box>

        <Box sx={{ mt: 3 }}>
          <TermsContent />
        </Box>
      </Box>
    </Box>
  );

  return standalone ? <PublicPage>{page}</PublicPage> : page;
}
