import { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from "@mui/material";
import { ContactSupport } from "@mui/icons-material";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { userApiService } from "@services/UserApiService";
import { colors } from "@styles/colors";

export default function ContactSection() {
  const { t } = useTranslation("settings");
  const [modalOpen, setModalOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const sendContactMessageMutation = useMutation({
    mutationFn: (data: { subject: string; message: string }) =>
      userApiService.sendContactMessage(data),
    onSuccess: () => {
      setContactMessage({ type: "success", text: t("contact.success") });
      setModalOpen(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setContactMessage(null), 3000);
    },
    onError: (e: Error) => {
      setContactMessage({
        type: "error",
        text: e.message || t("contact.error"),
      });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setContactMessage(null), 5000);
    },
  });

  return (
    <>
      <Card
        sx={{
          mb: 4,
          bgcolor: "rgba(201, 167, 38, 0.05)",
          border: "1px solid rgba(201, 167, 38, 0.2)",
        }}
      >
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <ContactSupport sx={{ color: "primary.main", mr: 1 }} />
            <Typography variant="h6">{t("contact.title")}</Typography>
          </Box>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
            {t("contact.intro")}
            <br />
            {t("contact.invite")}
          </Typography>
          <Box sx={{ display: "flex", justifyContent: { xs: "center", md: "flex-end" }, mx: 2 }}>
            <Button
              variant="contained"
              startIcon={<ContactSupport />}
              onClick={() => setModalOpen(true)}
              sx={{ bgcolor: "primary.main", "&:hover": { bgcolor: colors.goldDark } }}
            >
              {t("contact.title")}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <ContactSupport sx={{ color: "primary.main", mr: 1 }} />
            {t("contact.title")}
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
            ref={formRef}
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const subject = formData.get("subject") as string;
              const message = formData.get("message") as string;
              if (subject && message) {
                sendContactMessageMutation.mutate({ subject, message });
              }
            }}
          >
            <TextField
              fullWidth
              name="subject"
              label={t("contact.subject")}
              required
              margin="normal"
              helperText={t("contact.subjectHelp")}
              slotProps={{
                htmlInput: { minLength: 1, maxLength: 200 },
              }}
            />
            <TextField
              fullWidth
              name="message"
              label={t("contact.message")}
              required
              multiline
              rows={4}
              margin="normal"
              helperText={t("contact.messageHelp")}
              slotProps={{
                htmlInput: { minLength: 1, maxLength: 2000 },
              }}
            />
            <button type="submit" style={{ display: "none" }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>{t("common:actions.cancel")}</Button>
          <Button
            onClick={() => formRef.current?.requestSubmit()}
            variant="contained"
            disabled={sendContactMessageMutation.isPending}
            sx={{ bgcolor: "primary.main", "&:hover": { bgcolor: colors.goldDark } }}
          >
            {sendContactMessageMutation.isPending ? t("common:actions.sending") : t("contact.submit")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
