import { logger } from "@utils/logger";
import { isApiError } from "@utils/apiError";
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Close, MyLocation, CheckCircle } from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { atlasApiService, PlaceTypeData } from "@services/AtlasApiService";
import { colors } from "@styles/colors";
import { useTranslation } from "react-i18next";
import i18n, { localizedCountry } from "@utils/i18n";
import { placeTypeLabel } from "@components/Atlas/placeReportLabels";

interface Country {
  name: string;
  code: string;
}

interface AtlasSpotAddModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PlaceFormData) => Promise<void>;
  isMobile: boolean;
}

interface PlaceFormData {
  name: string;
  address: string;
  city: string;
  country: string;
  description: string;
  source_url: string;
  place_type_id: number;
}

const schema = yup
  .object({
    name: yup
      .string()
      .required(() => i18n.t("atlas:add.nameRequired"))
      .min(1, () => i18n.t("atlas:add.nameEmpty")),
    address: yup.string().required(() => i18n.t("atlas:add.addressRequired")),
    city: yup.string().required(() => i18n.t("atlas:add.cityRequired")),
    country: yup.string().required(() => i18n.t("atlas:add.countryRequired")),
    description: yup
      .string()
      .optional()
      .default("")
      .max(600, () => i18n.t("atlas:add.descriptionMax")),
    source_url: yup.string().url(() => i18n.t("atlas:add.urlInvalid")).optional().default(""),
    place_type_id: yup
      .number()
      .required(() => i18n.t("atlas:add.typeRequired"))
      .positive(() => i18n.t("atlas:add.typeRequired")),
  })
  .required();

const AtlasSpotAddModal: React.FC<AtlasSpotAddModalProps> = ({
  open,
  onClose,
  onSubmit,
  isMobile,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation("atlas");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const { data: countries = [], isError: countriesError } = useQuery<Country[]>({
    queryKey: ["countries"],
    queryFn: async () => {
      const response = await fetch("/data/countries.json");
      if (!response.ok) throw new Error(t("add.countriesFailed"));
      return response.json() as Promise<Country[]>;
    },
    enabled: open,
    staleTime: Infinity,
  });

  const { data: placeTypes = [], isError: typesError } = useQuery<PlaceTypeData[]>({
    queryKey: ["place-types"],
    queryFn: () => atlasApiService.getPlaceTypes(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const loadError = countriesError || typesError
    ? t("add.loadFailed")
    : null;

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
    reset,
  } = useForm<PlaceFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      description: "",
      source_url: "",
      country: "France",
    },
  });

  useEffect(() => {
    if (countries.length > 0 && open) {
      setValue("country", "France");
    }
  }, [countries, open, setValue]);

  const formFieldStyle = {
    mb: 2,
    "& .MuiOutlinedInput-root": {
      color: "text.primary",
      "& fieldset": {
        borderColor: colors.grey600,
      },
      "&:hover fieldset": {
        borderColor: colors.grey500,
      },
      "&.Mui-focused fieldset": {
        borderColor: colors.grey500,
      },
    },
    "& .MuiInputLabel-root": {
      color: colors.textMuted,
      "&.Mui-focused": {
        color: colors.textMuted,
      },
    },
    "& .MuiFormHelperText-root": {
      color: colors.textMuted,
    },
  };

  const handleFormSubmit = async (data: PlaceFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await onSubmit(data);
      reset();
      setShowSuccessDialog(true);
    } catch (err: unknown) {
      logger.error("Error submitting place:", err);
      const message = isApiError(err) ? err.message : t("add.failed");
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    onClose();
  };

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    onClose();
  };

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        sx={{
          display: "flex",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "center",
          margin: "auto",
          border: "none",
          height: isMobile ? "100dvh" : "100vh",
        }}
      >
        <Box
          sx={{
            bgcolor: "background.default",
            borderRadius: "5px",
            width: isMobile ? "90dvw" : { sm: 520, md: 600 },
            maxWidth: "90vw",
            maxHeight: isMobile ? "80dvh" : "90vh",
            overflowY: "auto",
            boxShadow: 6,
            mt: isMobile ? "calc(5dvh + var(--safe-top))" : 0,
            mb: isMobile ? "5dvh" : 0,
            p: isMobile ? 2 : 4,
            position: "relative",
            color: "text.primary",
          }}
        >
          <IconButton
            onClick={handleClose}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              zIndex: 1,
              color: "text.primary",
            }}
          >
            <Close />
          </IconButton>

          <Typography
            variant="h5"
            sx={{
              mb: 3,
              textAlign: "center",
              fontWeight: "bold",
              color: "primary.main",
            }}
          >
            🎯 {t("map.addAria")}
          </Typography>

          {(error || loadError) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error ?? loadError}
            </Alert>
          )}

          <form onSubmit={(e) => { void handleSubmit(handleFormSubmit)(e); }}>
            <Box sx={{ maxWidth: "600px", margin: "0 auto" }}>
              <Typography variant="h6" sx={{ mb: 2, color: "primary.main" }}>
                {t("add.details")}
              </Typography>

              <TextField
                fullWidth
                label={t("add.name")}
                {...register("name")}
                error={!!errors.name}
                helperText={errors.name?.message}
                sx={formFieldStyle}
              />

              <Controller
                name="place_type_id"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth sx={formFieldStyle}>
                    <InputLabel>{t("add.type")}</InputLabel>
                    <Select
                      {...field}
                      value={field.value ?? ""}
                      error={!!errors.place_type_id}
                      label={t("add.type")}
                    >
                      {placeTypes.map((type) => (
                        <MenuItem key={type.id} value={type.id}>
                          {placeTypeLabel(type.name)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />

              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth sx={formFieldStyle}>
                    <InputLabel>{t("add.country")}</InputLabel>
                    <Select
                      {...field}
                      error={!!errors.country}
                      label={t("add.country")}
                      MenuProps={{
                        slotProps: {
                          paper: {
                            style: {
                              maxHeight: 300,
                            },
                          },
                        },
                      }}
                    >
                      {countries.map((country) => (
                        <MenuItem key={country.code} value={country.name}>
                          {/* Stored in English, as the Atlas keeps it; shown in the language of the interface */}
                          {localizedCountry(country.name)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />

              <TextField
                fullWidth
                label={t("add.city")}
                {...register("city")}
                error={!!errors.city}
                helperText={errors.city?.message}
                sx={formFieldStyle}
              />

              <TextField
                fullWidth
                label={t("add.address")}
                {...register("address")}
                error={!!errors.address}
                helperText={errors.address?.message}
                sx={formFieldStyle}
              />

              <TextField
                fullWidth
                label={t("add.description")}
                multiline
                rows={3}
                {...register("description")}
                error={!!errors.description}
                helperText={errors.description?.message}
                sx={formFieldStyle}
              />

              <TextField
                fullWidth
                label={t("add.source")}
                {...register("source_url")}
                error={!!errors.source_url}
                helperText={errors.source_url?.message}
                sx={formFieldStyle}
              />

              <Stack direction="row" spacing={2} sx={{ justifyContent: "flex-end" }}>
                <Button variant="outlined" onClick={handleClose}>
                  {t("common:actions.cancel")}
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading}
                  startIcon={
                    isLoading ? <CircularProgress size={20} /> : <MyLocation />
                  }
                  sx={{
                    backgroundColor: "primary.main",
                    "&:hover": {
                      backgroundColor: "primary.dark",
                    },
                    "&:disabled": {
                      backgroundColor: colors.grey600,
                    },
                  }}
                >
                  {isLoading ? t("add.adding") : t("add.submit")}
                </Button>
              </Stack>
            </Box>
          </form>
        </Box>
      </Modal>

      {/* Success Dialog */}
      <Dialog
        open={showSuccessDialog}
        onClose={handleSuccessDialogClose}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: "background.default",
              color: "text.primary",
              borderRadius: "8px",
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: "primary.main",
            fontWeight: "bold",
          }}
        >
          <CheckCircle sx={{ color: "primary.main" }} />
          {t("add.submitted")}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "text.primary", mb: 2 }}>
            {t("add.thanks")}
          </Typography>
          <Typography sx={{ color: colors.textMuted, fontSize: "0.9rem" }}>
            {t("add.why")}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleSuccessDialogClose}
            variant="contained"
            sx={{
              backgroundColor: "primary.main",
              "&:hover": {
                backgroundColor: "primary.dark",
              },
            }}
          >
            {t("add.gotIt")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AtlasSpotAddModal;
