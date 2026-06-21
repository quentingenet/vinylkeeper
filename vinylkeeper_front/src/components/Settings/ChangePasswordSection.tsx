import { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  OutlinedInput,
  Grid,
} from "@mui/material";
import { Lock, Visibility, VisibilityOff } from "@mui/icons-material";
import { useMutation } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import type { FieldError } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { passwordChangeValidationSchema } from "@utils/validators/passwordChangeValidationSchema";
import PasswordStrengthIndicator from "@components/UI/PasswordStrengthIndicator";
import { userApiService } from "@services/UserApiService";

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const PASSWORD_FIELDS = [
  { name: "currentPassword" as const, label: "Current Password" },
  { name: "newPassword" as const, label: "New Password" },
  { name: "confirmPassword" as const, label: "Confirm New Password" },
];

export default function ChangePasswordSection() {
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset,
  } = useForm<PasswordFormData>({
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    resolver: yupResolver(passwordChangeValidationSchema),
    mode: "onChange",
  });
  // eslint-disable-next-line react-hooks/incompatible-library
  const newPassword = watch("newPassword");

  const changePasswordMutation = useMutation({
    mutationFn: (data: PasswordFormData) => userApiService.changePassword(data),
    onSuccess: () => {
      setPasswordMessage({ type: "success", text: "Password changed successfully!" });
      reset();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setPasswordMessage(null), 3000);
    },
    onError: (e: Error) => {
      setPasswordMessage({ type: "error", text: e.message || "Failed to change password" });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setPasswordMessage(null), 5000);
    },
  });

  return (
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
          onSubmit={(e) => {
            void handleSubmit((data) => changePasswordMutation.mutate(data))(e);
          }}
        >
          <Grid container spacing={2}>
            {PASSWORD_FIELDS.map(({ name, label }) => (
              <Grid key={name} size={{ xs: 12 }}>
                <Controller
                  name={name}
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>{label}</InputLabel>
                      <OutlinedInput
                        {...field}
                        type={showPassword[name] ? "text" : "password"}
                        error={Boolean(errors[name])}
                        endAdornment={
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() =>
                                setShowPassword((prev) => ({ ...prev, [name]: !prev[name] }))
                              }
                              edge="end"
                            >
                              {showPassword[name] ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        }
                        label={label}
                      />
                    </FormControl>
                  )}
                />
                {errors[name] && (
                  <Typography color="error" variant="caption" sx={{ mt: 0.5, display: "block" }}>
                    {(errors[name] as FieldError | undefined)?.message}
                  </Typography>
                )}
              </Grid>
            ))}
          </Grid>
          <PasswordStrengthIndicator password={newPassword} />
          <Box mt={2} display="flex" justifyContent={{ xs: "center", md: "flex-end" }} mx={2}>
            <Button
              type="submit"
              variant="contained"
              startIcon={<Lock />}
              disabled={!isValid || changePasswordMutation.isPending}
              sx={{ bgcolor: "#C9A726", "&:hover": { bgcolor: "#B8961F" } }}
            >
              {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
            </Button>
          </Box>
        </form>
      </CardContent>
    </Card>
  );
}
