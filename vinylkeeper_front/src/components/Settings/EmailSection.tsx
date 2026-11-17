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
import { useTranslation } from "react-i18next";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import i18n from "@utils/i18n";
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
    .required(() => i18n.t("validation:email.newRequired"))
    .test("email", () => i18n.t("validation:email.invalid"), (value) => (value ? emailValidator.test(value) : false)),
  currentPassword: yup.string().required(() => i18n.t("validation:password.currentRequired")),
});

/** Email of the account: confirmation status, a new link, and a change confirmed from the new address. */
export default function EmailSection({ email, isEmailConfirmed }: EmailSectionProps) {
  const { t } = useTranslation("settings");
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
    // The API answers in English: the app says it in the language of the interface
    onSuccess: () => setMessage({ type: "success", text: t("email.linkSent") }),
    onError: (e: Error) => setMessage({ type: "error", text: e.message }),
  });

  const changeMutation = useMutation({
    mutationFn: (data: EmailFormData) => userApiService.requestEmailChange(data),
    onSuccess: () => {
      setMessage({ type: "success", text: t("email.changeSent") });
      reset();
    },
    onError: (e: Error) => setMessage({ type: "error", text: e.message }),
  });

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Email sx={{ color: "primary.main", mr: 1 }} />
          <Typography variant="h6">{t("email.title")}</Typography>
        </Box>
        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 3 }}>
          <TextField label={t("email.current")} value={email} disabled sx={{ flexGrow: 1, minWidth: 220 }} />
          <Chip
            label={isEmailConfirmed ? t("email.confirmed") : t("email.notConfirmed")}
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
              {resendMutation.isPending ? t("common:actions.sending") : t("email.sendLink")}
            </Button>
          )}
        </Box>

        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {t("email.changeTitle")}
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
                    label={t("email.newEmail")}
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
                    <InputLabel>{t("email.currentPassword")}</InputLabel>
                    <OutlinedInput
                      {...field}
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      error={Boolean(errors.currentPassword)}
                      label={t("email.currentPassword")}
                      endAdornment={
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={showPassword ? t("common:password.hide") : t("common:password.show")}
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
          <Box sx={{ mt: 2, display: "flex", justifyContent: { xs: "center", md: "flex-end" }, mx: 2 }}>
            <Button
              type="submit"
              variant="contained"
              startIcon={<Email />}
              disabled={!isValid || changeMutation.isPending}
              sx={{ bgcolor: "primary.main", "&:hover": { bgcolor: colors.goldDark } }}
            >
              {changeMutation.isPending ? t("common:actions.sending") : t("email.change")}
            </Button>
          </Box>
        </form>
      </CardContent>
    </Card>
  );
}
