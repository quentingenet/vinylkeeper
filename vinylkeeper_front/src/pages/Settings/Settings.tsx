import { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  OutlinedInput,
  Grid,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Delete,
  Lock,
  Person,
  Security,
  Description,
  ContactSupport,
} from "@mui/icons-material";
import { useUserContext } from "@contexts/UserContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userApiService, UserSettingsResponse } from "@services/UserApiService";
import useDetectMobile from "@hooks/useDetectMobile";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { passwordChangeValidationSchema } from "@utils/validators/passwordChangeValidationSchema";
import PasswordStrengthIndicator from "@components/UI/PasswordStrengthIndicator";
import ModalTermsVinylKeeper from "@components/Modals/ModalTermsVinylKeeper";
import VinylSpinner from "@components/UI/VinylSpinner";

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const { currentUser, isUserLoggedIn, logout } = useUserContext();
  const { isMobile } = useDetectMobile();
  const queryClient = useQueryClient();

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [deleteAccountDialog, setDeleteAccountDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [openTermsModal, setOpenTermsModal] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const contactFormRef = useRef<HTMLFormElement>(null);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset,
  } = useForm<PasswordFormData>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    resolver: yupResolver(passwordChangeValidationSchema),
    mode: "onChange",
  });
  const newPassword = watch("newPassword");

  const changePasswordMutation = useMutation({
    mutationFn: (data: PasswordFormData) => userApiService.changePassword(data),
    onSuccess: () => {
      setPasswordMessage({
        type: "success",
        text: "Password changed successfully!",
      });
      reset();
      setTimeout(() => setPasswordMessage(null), 3000);
    },
    onError: (e: any) => {
      setPasswordMessage({
        type: "error",
        text: e.message || "Failed to change password",
      });
      setTimeout(() => setPasswordMessage(null), 5000);
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => userApiService.deleteAccount(),
    onSuccess: () => {
      setDeleteAccountDialog(false);
      setDeleteConfirmation("");
      logout();
      setTimeout(() => navigate("/"), 100);
    },
    onError: (e: any) => console.error("Failed to delete account:", e),
  });

  const sendContactMessageMutation = useMutation({
    mutationFn: (data: { subject: string; message: string }) =>
      userApiService.sendContactMessage(data),
    onSuccess: () => {
      setContactMessage({
        type: "success",
        text: "Contact message sent successfully!",
      });
      setContactModalOpen(false);
      setTimeout(() => setContactMessage(null), 3000);
    },
    onError: (e: any) => {
      setContactMessage({
        type: "error",
        text: e.message || "Failed to send contact message",
      });
      setTimeout(() => setContactMessage(null), 5000);
    },
  });

  const handleDeleteAccount = () => {
    if (deleteConfirmation === "DELETE") {
      deleteAccountMutation.mutate();
    }
  };

  const handleSendContactMessage = (subject: string, message: string) => {
    sendContactMessageMutation.mutate({ subject, message });
  };

  // Invalidate user settings queries when user changes
  useEffect(() => {
    if (currentUser?.user_uuid) {
      queryClient.invalidateQueries({ queryKey: ["userSettings"] });
    }
  }, [currentUser?.user_uuid, queryClient]);

  const {
    data: settingsUser,
    isLoading,
    error,
  } = useQuery<UserSettingsResponse>({
    queryKey: ["userSettings", currentUser?.user_uuid],
    queryFn: userApiService.getCurrentUserSettings,
    staleTime: 300000,
    enabled: Boolean(isUserLoggedIn) && !!currentUser?.user_uuid,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error?.message?.includes("Unauthorized")) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: 1000,
  });

  if (!isUserLoggedIn || !currentUser) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
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
      {/* Profile Information */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Person sx={{ color: "#C9A726", mr: 1 }} />
            <Typography variant="h6">Profile informations</Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Username"
                value={currentUser.username}
                disabled
              />
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
                  value={
                    settingsUser?.is_accepted_terms
                      ? "Accepted"
                      : "Not accepted"
                  }
                  disabled
                />
                <IconButton
                  onClick={() => setOpenTermsModal(true)}
                  sx={{
                    color: "#C9A726",
                    "&:hover": { bgcolor: "rgba(201,167,38,0.1)" },
                  }}
                  title="View Terms"
                >
                  <Description />
                </IconButton>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Lock sx={{ color: "#C9A726", mr: 1 }} />
            <Typography variant="h6">Change password</Typography>
          </Box>
          {passwordMessage && (
            <Alert severity={passwordMessage.type} sx={{ mb: 2 }}>
              {passwordMessage.text}
            </Alert>
          )}
          <form
            onSubmit={handleSubmit((data) =>
              changePasswordMutation.mutate(data)
            )}
          >
            <Grid container spacing={2}>
              {["currentPassword", "newPassword", "confirmPassword"].map(
                (fieldName, idx) => {
                  const isShow =
                    idx === 0
                      ? showCurrentPassword
                      : idx === 1
                      ? showNewPassword
                      : showConfirmPassword;
                  const setShow =
                    idx === 0
                      ? setShowCurrentPassword
                      : idx === 1
                      ? setShowNewPassword
                      : setShowConfirmPassword;
                  const label =
                    fieldName === "currentPassword"
                      ? "Current Password"
                      : fieldName === "newPassword"
                      ? "New Password"
                      : "Confirm New Password";
                  return (
                    <Grid key={fieldName} size={{ xs: 12 }}>
                      <Controller
                        name={fieldName as any}
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth variant="outlined">
                            <InputLabel>{label}</InputLabel>
                            <OutlinedInput
                              {...field}
                              type={isShow ? "text" : "password"}
                              error={Boolean(
                                errors[fieldName as keyof typeof errors]
                              )}
                              endAdornment={
                                <InputAdornment position="end">
                                  <IconButton
                                    onClick={() => setShow((prev) => !prev)}
                                    edge="end"
                                  >
                                    {isShow ? (
                                      <VisibilityOff />
                                    ) : (
                                      <Visibility />
                                    )}
                                  </IconButton>
                                </InputAdornment>
                              }
                              label={label}
                            />
                          </FormControl>
                        )}
                      />
                      {errors[fieldName as keyof typeof errors] && (
                        <Typography
                          color="error"
                          variant="caption"
                          sx={{ mt: 0.5, display: "block" }}
                        >
                          {
                            (errors[fieldName as keyof typeof errors] as any)
                              .message
                          }
                        </Typography>
                      )}
                    </Grid>
                  );
                }
              )}
            </Grid>
            <PasswordStrengthIndicator password={newPassword} />
            <Box
              mt={2}
              display="flex"
              justifyContent={{ xs: "center", md: "flex-end" }}
              mx={2}
            >
              <Button
                type="submit"
                variant="contained"
                startIcon={<Lock />}
                disabled={!isValid || changePasswordMutation.isPending}
                sx={{ bgcolor: "#C9A726", "&:hover": { bgcolor: "#B8961F" } }}
              >
                {changePasswordMutation.isPending
                  ? "Changing..."
                  : "Change Password"}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card
        sx={{
          mb: 4,
          bgcolor: "rgba(201, 167, 38, 0.05)",
          border: "1px solid rgba(201, 167, 38, 0.2)",
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <ContactSupport sx={{ color: "#C9A726", mr: 1 }} />
            <Typography variant="h6">Contact support</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Questions, feedback, or bug reports?
            <br />
            We'd love to hear from you! Drop us a message and we'll reply as
            soon as we can.
          </Typography>
          <Box
            display="flex"
            justifyContent={{ xs: "center", md: "flex-end" }}
            mx={2}
          >
            <Button
              variant="contained"
              startIcon={<ContactSupport />}
              onClick={() => setContactModalOpen(true)}
              sx={{ bgcolor: "#C9A726", "&:hover": { bgcolor: "#B8961F" } }}
            >
              Contact support
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card sx={{ border: "2px solid #f44336" }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Security sx={{ color: "#f44336", mr: 1 }} />
            <Typography variant="h6" color="error">
              Danger zone
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Once you delete your account, it's permanent.
          </Typography>
          <Box
            display="flex"
            justifyContent={{ xs: "center", md: "flex-end" }}
            mx={2}
          >
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => setDeleteAccountDialog(true)}
            >
              Delete account
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog
        open={deleteAccountDialog}
        onClose={() => setDeleteAccountDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle color="error">Delete account</DialogTitle>
        <DialogContent>
          <Typography mb={2}>This action cannot be undone.</Typography>
          <TextField
            fullWidth
            placeholder="Type DELETE to confirm"
            label="Confirm deletion"
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAccountDialog(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteAccount}
            color="error"
            variant="contained"
            disabled={
              deleteConfirmation !== "DELETE" || deleteAccountMutation.isPending
            }
          >
            {deleteAccountMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <ModalTermsVinylKeeper
        openTermsModal={openTermsModal}
        setOpenTermsModal={setOpenTermsModal}
      />

      {/* Contact Modal */}
      <Dialog
        open={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <ContactSupport sx={{ color: "#C9A726", mr: 1 }} />
            Contact support
          </Box>
        </DialogTitle>
        <DialogContent>
          {contactMessage && (
            <Alert severity={contactMessage.type} sx={{ mb: 2 }}>
              {contactMessage.text}
            </Alert>
          )}
          <Box
            component="form"
            ref={contactFormRef}
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const subject = formData.get("subject") as string;
              const message = formData.get("message") as string;
              if (subject && message) {
                handleSendContactMessage(subject, message);
              }
            }}
          >
            <TextField
              fullWidth
              name="subject"
              label="Subject"
              required
              margin="normal"
              inputProps={{
                minLength: 1,
                maxLength: 200,
              }}
              helperText={`${200} max characters`}
            />
            <TextField
              fullWidth
              name="message"
              label="Message"
              required
              multiline
              rows={4}
              margin="normal"
              inputProps={{
                minLength: 1,
                maxLength: 2000,
              }}
              helperText={`${2000} max characters`}
            />
            {/* Hidden submit button for form submission */}
            <button type="submit" style={{ display: "none" }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContactModalOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (contactFormRef.current) {
                contactFormRef.current.requestSubmit();
              }
            }}
            variant="contained"
            disabled={sendContactMessageMutation.isPending}
            sx={{ bgcolor: "#C9A726", "&:hover": { bgcolor: "#B8961F" } }}
          >
            {sendContactMessageMutation.isPending
              ? "Sending..."
              : "Send message"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
