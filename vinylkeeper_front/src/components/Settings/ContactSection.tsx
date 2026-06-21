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
import { userApiService } from "@services/UserApiService";

export default function ContactSection() {
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
      setContactMessage({ type: "success", text: "Contact message sent successfully!" });
      setModalOpen(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setContactMessage(null), 3000);
    },
    onError: (e: Error) => {
      setContactMessage({
        type: "error",
        text: e.message || "Failed to send contact message",
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
          <Box display="flex" alignItems="center" mb={2}>
            <ContactSupport sx={{ color: "#C9A726", mr: 1 }} />
            <Typography variant="h6">Contact support</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Questions, feedback, or bug reports?
            <br />
            We'd love to hear from you! Drop us a message and we'll reply as soon as we can.
          </Typography>
          <Box display="flex" justifyContent={{ xs: "center", md: "flex-end" }} mx={2}>
            <Button
              variant="contained"
              startIcon={<ContactSupport />}
              onClick={() => setModalOpen(true)}
              sx={{ bgcolor: "#C9A726", "&:hover": { bgcolor: "#B8961F" } }}
            >
              Contact support
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
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
              label="Subject"
              required
              margin="normal"
              inputProps={{ minLength: 1, maxLength: 200 }}
              helperText="200 max characters"
            />
            <TextField
              fullWidth
              name="message"
              label="Message"
              required
              multiline
              rows={4}
              margin="normal"
              inputProps={{ minLength: 1, maxLength: 2000 }}
              helperText="2000 max characters"
            />
            <button type="submit" style={{ display: "none" }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button
            onClick={() => formRef.current?.requestSubmit()}
            variant="contained"
            disabled={sendContactMessageMutation.isPending}
            sx={{ bgcolor: "#C9A726", "&:hover": { bgcolor: "#B8961F" } }}
          >
            {sendContactMessageMutation.isPending ? "Sending..." : "Send message"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
