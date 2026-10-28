import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  TextField,
  Typography,
} from "@mui/material";
import { Email, Send, Visibility, VisibilityOff } from "@mui/icons-material";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { userApiService } from "@services/UserApiService";
import { emailValidator } from "@utils/Regex";
import { colors } from "@styles/colors";

interface EmailSectionProps {
  email: string;
  isEmailConfirmed: boolean;
}

interface EmailFormData {
  newEmail: string;
  currentPassword: string;
}

type Message = { type: "success" | "error"; text: string } | null;

const emailChangeSchema = yup.object({
  newEmail: yup
    .string()
    .required("Enter your new email address.")
    .test("email", "Email not valid", (value) => (value ? emailValidator.test(value) : false)),
  currentPassword: yup.string().required("Enter your current password."),
});

/** Email of the account: confirmation status, a new link, and a change confirmed from the new address. */
export default function EmailSection({ email, isEmailConfirmed }: EmailSectionProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<EmailFormData>({
    defaultValues: { newEmail: "", currentPassword: "" },
    resolver: yupResolver(emailChangeSchema),
    mode: "onChange",
  });

  const resendMutation = useMutation({
    mutationFn: () => userApiService.resendEmailConfirmation(),
    onSuccess: (data) => setMessage({ type: "success", text: data.message }),
    onError: (e: Error) => setMessage({ type: "error", text: e.message }),
  });

  const changeMutation = useMutation({
    mutationFn: (data: EmailFormData) => userApiService.requestEmailChange(data),
    onSuccess: (data) => {
      setMessage({
        type: "success",
        text: `${data.message}. Your current email address stays in use until you open that link.`,
      });
      reset();
    },
    onError: (e: Error) => setMessage({ type: "error", text: e.message }),
  });

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <Email sx={{ color: "primary.main", mr: 1 }} />
          <Typography variant="h6">Email address</Typography>
        </Box>
        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={3}>
          <TextField label="Current email" value={email} disabled sx={{ flexGrow: 1, minWidth: 220 }} />
          <Chip
            label={isEmailConfirmed ? "Confirmed" : "Not confirmed"}
            color={isEmailConfirmed ? "success" : "warning"}
            variant="outlined"
          />
          {!isEmailConfirmed && (
            <Button
              variant="outlined"
              startIcon={<Send />}
              onClick={() => resendMutation.mutate()}
              disabled={resendMutation.isPending}
            >
              {resendMutation.isPending ? "Sending..." : "Send a new link"}
            </Button>
          )}
        </Box>

        <Typography variant="subtitle1" mb={1}>
          Change your email address
        </Typography>
        <form
          onSubmit={(e) => {
            void handleSubmit((data) => changeMutation.mutate(data))(e);
          }}
        >
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="newEmail"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="email"
                    label="New email"
                    autoComplete="email"
                    error={Boolean(errors.newEmail)}
                    helperText={errors.newEmail?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="currentPassword"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth variant="outlined">
                    <InputLabel>Current Password</InputLabel>
                    <OutlinedInput
                      {...field}
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      error={Boolean(errors.currentPassword)}
                      label="Current Password"
                      endAdornment={
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            onClick={() => setShowPassword((prev) => !prev)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      }
                    />
                  </FormControl>
                )}
              />
            </Grid>
          </Grid>
          <Box mt={2} display="flex" justifyContent={{ xs: "center", md: "flex-end" }} mx={2}>
            <Button
              type="submit"
              variant="contained"
              startIcon={<Email />}
              disabled={!isValid || changeMutation.isPending}
              sx={{ bgcolor: "primary.main", "&:hover": { bgcolor: colors.goldDark } }}
            >
              {changeMutation.isPending ? "Sending..." : "Change email"}
            </Button>
          </Box>
        </form>
      </CardContent>
    </Card>
  );
}
