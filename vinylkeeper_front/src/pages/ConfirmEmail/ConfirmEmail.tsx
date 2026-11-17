import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Card, CardContent, Typography } from "@mui/material";
import { MarkEmailRead } from "@mui/icons-material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userApiService } from "@services/UserApiService";
import { useUserContext } from "@contexts/UserContext";
import { queryKeys } from "@utils/queryKeys";
import VinylSpinner from "@components/UI/VinylSpinner";
import { usePageMeta } from "@hooks/usePageMeta";
import { useTranslation } from "react-i18next";

/** Opened from the link of the registration or email change email, logged in or not. */
export default function ConfirmEmail() {
  const { t } = useTranslation("auth");
  // Opened from an email link: nothing for search engines
  usePageMeta({ title: t("confirm.metaTitle"), noIndex: true });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isUserLoggedIn } = useUserContext();
  const token = new URLSearchParams(useLocation().search).get("token") ?? "";

  const confirmation = useQuery({
    queryKey: queryKeys.confirmEmail(token),
    queryFn: () => userApiService.confirmEmail(token),
    enabled: token !== "",
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (confirmation.isSuccess) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.userSettings.all() });
    }
  }, [confirmation.isSuccess, queryClient]);

  const errorMessage = !token
    ? t("confirm.incomplete")
    : confirmation.isError
      ? t("confirm.askNew", { reason: confirmation.error.message })
      : null;

  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "70vh", p: 2 }}>
      <Card sx={{ maxWidth: 480, width: "100%" }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <MarkEmailRead sx={{ color: "primary.main", mr: 1 }} />
            <Typography variant="h6">{t("confirm.title")}</Typography>
          </Box>
          {confirmation.isLoading && <VinylSpinner />}
          {confirmation.isSuccess && (
            <Alert severity="success">{t("confirm.success")}</Alert>
          )}
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          {!confirmation.isLoading && (
            <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
              <Button variant="contained" onClick={() => void navigate("/", { replace: true })}>
                {isUserLoggedIn ? t("confirm.back") : t("confirm.goTo")}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
