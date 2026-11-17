import { Box, Link, Typography } from "@mui/material";
import PublicPage from "@components/Layout/PublicPage";
import { CONTACT_EMAIL, TermsContent } from "@components/Modals/ModalTermsVinylKeeper";
import { useDocumentTitle } from "@hooks/useDocumentTitle";
import { colors } from "@styles/colors";
import { useTranslation } from "react-i18next";

/** Anchor of the account deletion instructions: the address to give to the app stores. */
export const DELETE_ACCOUNT_ANCHOR = "delete-account";

const linkProps = { color: "inherit", underline: "always", sx: { fontWeight: 600 } } as const;

/**
 * The terms of use and the privacy notice on a page of their own, open to everyone: the app stores ask for
 * an address for them, and for the way to delete an account. `standalone` adds the bar and the footer of the
 * home page, for a visitor; a member already has the menu of the app around it.
 */
export default function Terms({ standalone = false }: { standalone?: boolean }) {
  const { t } = useTranslation("terms");
  useDocumentTitle(t("pageTitle"));

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
          {t("heading")}
        </Typography>

        <Box component="section" id={DELETE_ACCOUNT_ANCHOR} sx={{ mt: 3, p: 2, border: `1px solid ${colors.black}` }}>
          <Typography component="h2" sx={{ color: "black", fontWeight: 700 }}>
            {t("deleteAccount.title")}
          </Typography>
          <Typography variant="body2" sx={{ color: "black", mt: 0.75 }}>
            {t("deleteAccount.steps", {
              settings: t("nav:items.settings"),
              dangerZone: t("settingsUsersVk:danger.title"),
              deleteAccount: t("settingsUsersVk:danger.delete"),
            })}
          </Typography>
          <Typography variant="body2" sx={{ color: "black", mt: 0.75 }}>
            {t("deleteAccount.cannotLogIn")}{" "}
            <Link {...linkProps} href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </Link>{" "}
            {t("deleteAccount.fromAddress")}
          </Typography>
          <Typography variant="body2" sx={{ color: "black", mt: 0.75 }}>
            {t("deleteAccount.whatIsKept")}
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
