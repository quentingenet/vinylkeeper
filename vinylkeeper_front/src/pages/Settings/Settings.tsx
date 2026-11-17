import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { formatLocale } from "@utils/i18n";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  IconButton,
  Grid,
  Tab,
  Tabs,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { primaryTabsSx } from "@components/UI/tabsStyles";
import { COLLECTIONS_TAB_PARAM, SETTINGS_APP_TAB_VALUE } from "@utils/GlobalUrls";
import { Person, Description } from "@mui/icons-material";
import { useUserContext } from "@contexts/UserContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userApiService, UserSettingsResponse } from "@services/UserApiService";
import { queryKeys } from "@utils/queryKeys";
import ModalTermsVinylKeeper from "@components/Modals/ModalTermsVinylKeeper";
import VinylSpinner from "@components/UI/VinylSpinner";
import ChangePasswordSection from "@components/Settings/ChangePasswordSection";
import EmailSection from "@components/Settings/EmailSection";
import ContactSection from "@components/Settings/ContactSection";
import DangerZoneSection from "@components/Settings/DangerZoneSection";
import CurrencySection from "@components/Settings/CurrencySection";
import LanguageSection from "@components/Settings/LanguageSection";

type SettingsTab = "profile" | "app";

const TAB_IDS: Record<SettingsTab, { tab: string; panel: string }> = {
  profile: { tab: "settings-tab-profile", panel: "settings-tabpanel-profile" },
  app: { tab: "settings-tab-app", panel: "settings-tabpanel-app" },
};

export default function Settings() {
  const { t } = useTranslation("settingsUsersVk");
  // The tab lives in the URL, as on the Collections page: back/forward and links keep it
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: SettingsTab = searchParams.get(COLLECTIONS_TAB_PARAM) === SETTINGS_APP_TAB_VALUE ? "app" : "profile";
  const handleTabChange = (_event: React.SyntheticEvent, next: SettingsTab) => {
    if (next === activeTab) return;
    const params = new URLSearchParams(searchParams);
    if (next === "app") params.set(COLLECTIONS_TAB_PARAM, SETTINGS_APP_TAB_VALUE);
    else params.delete(COLLECTIONS_TAB_PARAM);
    setSearchParams(params);
  };
  const { currentUser, isUserLoggedIn } = useUserContext();
  const queryClient = useQueryClient();
  const [openTermsModal, setOpenTermsModal] = useState(false);

  useEffect(() => {
    if (currentUser?.user_uuid) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.userSettings.all() });
    }
  }, [currentUser?.user_uuid, queryClient]);

  const {
    data: settingsUser,
    isLoading,
    error,
  } = useQuery<UserSettingsResponse>({
    queryKey: queryKeys.userSettings.forUser(currentUser?.user_uuid),
    queryFn: userApiService.getCurrentUserSettings,
    staleTime: 300000,
    enabled: Boolean(isUserLoggedIn) && !!currentUser?.user_uuid,
    retry: (failureCount, error) => {
      if (error?.message?.includes("Unauthorized")) return false;
      return failureCount < 2;
    },
    retryDelay: 1000,
  });

  if (!isUserLoggedIn || !currentUser) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
        <Typography variant="h6" color="error">
          {t("loginRequired")}
        </Typography>
      </Box>
    );
  }
  if (isLoading) return <VinylSpinner />;
  if (error) return <div>{t("loadError")}</div>;

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label={t("tabs.label")}
          variant="fullWidth"
          sx={[
            primaryTabsSx,
            (theme) => ({
              "& .MuiTab-root": {
                fontSize: theme.typography.h3.fontSize,
                fontWeight: theme.typography.h3.fontWeight,
              },
            }),
          ]}
        >
          <Tab label={t("tabs.profile")} value="profile" id={TAB_IDS.profile.tab} aria-controls={TAB_IDS.profile.panel} />
          <Tab label={t("tabs.app")} value="app" id={TAB_IDS.app.tab} aria-controls={TAB_IDS.app.panel} />
        </Tabs>
      </Box>

      <Box role="tabpanel" id={TAB_IDS[activeTab].panel} aria-labelledby={TAB_IDS[activeTab].tab}>
      {activeTab === "profile" ? (
      <>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Person sx={{ color: "primary.main", mr: 1 }} />
            <Typography variant="h6">{t("profile.title")}</Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label={t("profile.username")} value={currentUser.username} disabled />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t("profile.createdAt")}
                value={
                  settingsUser?.created_at
                    ? new Date(settingsUser.created_at).toLocaleDateString(formatLocale())
                    : ""
                }
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TextField
                  fullWidth
                  label={t("profile.terms")}
                  value={settingsUser?.is_accepted_terms ? t("profile.accepted") : t("profile.notAccepted")}
                  disabled
                />
                <IconButton
                  onClick={() => setOpenTermsModal(true)}
                  sx={{ color: "primary.main", "&:hover": { bgcolor: "rgba(201,167,38,0.1)" } }}
                  title={t("profile.viewTerms")}
                  aria-label={t("profile.viewTerms")}
                >
                  <Description />
                </IconButton>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {settingsUser && (
        <EmailSection email={settingsUser.email} isEmailConfirmed={settingsUser.is_email_confirmed} />
      )}
      <ChangePasswordSection />
      <DangerZoneSection />
      </>
      ) : (
      <>
      <LanguageSection />
      {settingsUser && <CurrencySection currency={settingsUser.preferred_currency ?? "EUR"} />}
      </>
      )}
      </Box>

      {/* Outside the tabs: support stays in reach whatever the tab */}
      <Box sx={{ mt: 4 }}>
        <ContactSection />
      </Box>

      <ModalTermsVinylKeeper openTermsModal={openTermsModal} setOpenTermsModal={setOpenTermsModal} />
    </Box>
  );
}
