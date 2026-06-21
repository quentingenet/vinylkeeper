import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  IconButton,
  Grid,
} from "@mui/material";
import { Person, Description } from "@mui/icons-material";
import { useUserContext } from "@contexts/UserContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userApiService, UserSettingsResponse } from "@services/UserApiService";
import { queryKeys } from "@utils/queryKeys";
import ModalTermsVinylKeeper from "@components/Modals/ModalTermsVinylKeeper";
import VinylSpinner from "@components/UI/VinylSpinner";
import ChangePasswordSection from "@components/Settings/ChangePasswordSection";
import ContactSection from "@components/Settings/ContactSection";
import DangerZoneSection from "@components/Settings/DangerZoneSection";

export default function Settings() {
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography variant="h6" color="error">
          Please log in to access settings
        </Typography>
      </Box>
    );
  }
  if (isLoading) return <VinylSpinner />;
  if (error) return <div>Error loading user settings.</div>;

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Person sx={{ color: "#C9A726", mr: 1 }} />
            <Typography variant="h6">Profile informations</Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Username" value={currentUser.username} disabled />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={settingsUser?.email ?? ""}
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Account Created"
                value={
                  settingsUser?.created_at
                    ? new Date(settingsUser.created_at).toLocaleDateString()
                    : ""
                }
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box display="flex" alignItems="center" gap={1}>
                <TextField
                  fullWidth
                  label="Terms Accepted?"
                  value={settingsUser?.is_accepted_terms ? "Accepted" : "Not accepted"}
                  disabled
                />
                <IconButton
                  onClick={() => setOpenTermsModal(true)}
                  sx={{ color: "#C9A726", "&:hover": { bgcolor: "rgba(201,167,38,0.1)" } }}
                  title="View Terms"
                >
                  <Description />
                </IconButton>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <ChangePasswordSection />
      <ContactSection />
      <DangerZoneSection />

      <ModalTermsVinylKeeper openTermsModal={openTermsModal} setOpenTermsModal={setOpenTermsModal} />
    </Box>
  );
}
