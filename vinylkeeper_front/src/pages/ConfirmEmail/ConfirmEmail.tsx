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

/** Opened from the link of the registration or email change email, logged in or not. */
export default function ConfirmEmail() {
  // Opened from an email link: nothing for search engines
  usePageMeta({ title: "Confirm your email | Vinyl Keeper", noIndex: true });
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
    ? "This confirmation link is incomplete. Please open the link of the email again."
    : confirmation.isError
      ? `${confirmation.error.message} You can ask for a new link from your settings.`
      : null;

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh" p={2}>
      <Card sx={{ maxWidth: 480, width: "100%" }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <MarkEmailRead sx={{ color: "primary.main", mr: 1 }} />
            <Typography variant="h6">Email confirmation</Typography>
          </Box>
          {confirmation.isLoading && <VinylSpinner />}
          {confirmation.isSuccess && (
            <Alert severity="success">Your email address is confirmed. Thank you!</Alert>
          )}
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          {!confirmation.isLoading && (
            <Box mt={2} display="flex" justifyContent="flex-end">
              <Button variant="contained" onClick={() => void navigate("/", { replace: true })}>
                {isUserLoggedIn ? "Back to Vinyl Keeper" : "Go to Vinyl Keeper"}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
