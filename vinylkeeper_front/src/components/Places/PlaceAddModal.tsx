import { logger } from "@utils/logger";
import { isApiError } from "@utils/apiError";
import React, { useState, useEffect } from "react";
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
import { placeApiService, PlaceTypeData } from "@services/PlaceApiService";

interface Country {
  name: string;
  code: string;
}

interface PlaceAddModalProps {
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
      .required("Name is required")
      .min(1, "Name must not be empty"),
    address: yup.string().required("Address is required"),
    city: yup.string().required("City is required"),
    country: yup.string().required("Country is required"),
    description: yup
      .string()
      .optional()
      .default("")
      .max(600, "Description must not exceed 600 characters"),
    source_url: yup.string().url("Must be a valid URL").optional().default(""),
    place_type_id: yup
      .number()
      .required("Place type is required")
      .positive("Place type is required"),
  })
  .required();

const PlaceAddModal: React.FC<PlaceAddModalProps> = ({
  open,
  onClose,
  onSubmit,
  isMobile,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [placeTypes, setPlaceTypes] = useState<PlaceTypeData[]>([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [countriesResponse, types] = await Promise.all([
          fetch("/data/countries.json"),
          placeApiService.getPlaceTypes(),
        ]);
        if (!countriesResponse.ok) {
          throw new Error("Failed to load countries list.");
        }
        const countriesData = await countriesResponse.json() as Country[];
        setCountries(countriesData);
        setPlaceTypes(types);
      } catch (error) {
        logger.error("Error loading data:", error);
        setError("Failed to load form data. Please reopen the modal.");
      }
    };

    if (open) {
      void loadData();
    }
  }, [open]);

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

  // Set default country when countries are loaded
  useEffect(() => {
    if (countries.length > 0 && open) {
      setValue("country", "France");
    }
  }, [countries, open, setValue]);

  const formFieldStyle = {
    mb: 2,
    "& .MuiOutlinedInput-root": {
      color: "#fffbf9",
      "& fieldset": {
        borderColor: "#666",
      },
      "&:hover fieldset": {
        borderColor: "#888",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#888",
      },
    },
    "& .MuiInputLabel-root": {
      color: "#e4e4e4",
      "&.Mui-focused": {
        color: "#e4e4e4",
      },
    },
    "& .MuiFormHelperText-root": {
      color: "#e4e4e4",
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
      const message = isApiError(err) ? err.message : "Failed to add place. Please try again.";
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
            bgcolor: "#3f3f41",
            borderRadius: "5px",
            width: isMobile ? "90dvw" : { sm: 520, md: 600 },
            maxWidth: "90vw",
            maxHeight: isMobile ? "80dvh" : "90vh",
            overflowY: "auto",
            boxShadow: 6,
            mt: isMobile ? "5dvh" : 0,
            mb: isMobile ? "5dvh" : 0,
            p: isMobile ? 2 : 4,
            position: "relative",
            color: "#fffbf9",
          }}
        >
          <IconButton
            onClick={handleClose}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              zIndex: 1,
              color: "#fffbf9",
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
              color: "#C9A726",
            }}
          >
            🎯 Add new place
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={(e) => { void handleSubmit(handleFormSubmit)(e); }}>
            <Box sx={{ maxWidth: "600px", margin: "0 auto" }}>
              <Typography variant="h6" sx={{ mb: 2, color: "#C9A726" }}>
                Place details
              </Typography>

              <TextField
                fullWidth
                label="Place name"
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
                    <InputLabel>Place type</InputLabel>
                    <Select
                      {...field}
                      value={field.value ?? ""}
                      error={!!errors.place_type_id}
                      label="Place type"
                    >
                      {placeTypes.map((type) => (
                        <MenuItem key={type.id} value={type.id}>
                          {type.name.charAt(0).toUpperCase() + type.name.slice(1)}
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
                    <InputLabel>Country</InputLabel>
                    <Select
                      {...field}
                      error={!!errors.country}
                      label="Country"
                      MenuProps={{
                        PaperProps: {
                          style: {
                            maxHeight: 300,
                          },
                        },
                      }}
                    >
                      {countries.map((country) => (
                        <MenuItem key={country.code} value={country.name}>
                          {country.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />

              <TextField
                fullWidth
                label="City"
                {...register("city")}
                error={!!errors.city}
                helperText={errors.city?.message}
                sx={formFieldStyle}
              />

              <TextField
                fullWidth
                label="Address"
                {...register("address")}
                error={!!errors.address}
                helperText={errors.address?.message}
                sx={formFieldStyle}
              />

              <TextField
                fullWidth
                label="Description (optional)"
                multiline
                rows={3}
                {...register("description")}
                error={!!errors.description}
                helperText={errors.description?.message}
                sx={formFieldStyle}
              />

              <TextField
                fullWidth
                label="Source URL (optional)"
                {...register("source_url")}
                error={!!errors.source_url}
                helperText={errors.source_url?.message}
                sx={formFieldStyle}
              />

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button variant="outlined" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading}
                  startIcon={
                    isLoading ? <CircularProgress size={20} /> : <MyLocation />
                  }
                  sx={{
                    backgroundColor: "#C9A726",
                    "&:hover": {
                      backgroundColor: "#B8961F",
                    },
                    "&:disabled": {
                      backgroundColor: "#666",
                    },
                  }}
                >
                  {isLoading ? "Adding..." : "Add Place"}
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
        PaperProps={{
          sx: {
            bgcolor: "#3f3f41",
            color: "#fffbf9",
            borderRadius: "8px",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: "#C9A726",
            fontWeight: "bold",
          }}
        >
          <CheckCircle sx={{ color: "#C9A726" }} />
          Place Submitted Successfully!
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#fffbf9", mb: 2 }}>
            Thank you for your contribution! Your place suggestion has been
            submitted and will be reviewed by our moderation team before being
            displayed on the map.
          </Typography>
          <Typography sx={{ color: "#e4e4e4", fontSize: "0.9rem" }}>
            This helps us maintain the quality and accuracy of our vinyl
            community places.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleSuccessDialogClose}
            variant="contained"
            sx={{
              backgroundColor: "#C9A726",
              "&:hover": {
                backgroundColor: "#B8961F",
              },
            }}
          >
            Got it!
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PlaceAddModal;
