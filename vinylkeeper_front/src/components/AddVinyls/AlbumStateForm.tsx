import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { format, parse } from "date-fns";
import { vinylStates, VinylStateEnum } from "@utils/GlobalUtils";
import { type AlbumStateData } from "@hooks/useAddToCollection";
import { colors } from "@styles/colors";

interface AlbumStateFormProps {
  albumStateData: AlbumStateData;
  onAlbumStateChange: (
    field: keyof AlbumStateData,
    value: AlbumStateData[keyof AlbumStateData]
  ) => void;
  isDatePickerOpen: boolean;
  setIsDatePickerOpen: (open: boolean) => void;
}

export default function AlbumStateForm({
  albumStateData,
  onAlbumStateChange,
  isDatePickerOpen,
  setIsDatePickerOpen,
}: AlbumStateFormProps) {
  const handleDateChange = (newValue: Date | null) => {
    onAlbumStateChange(
      "acquisition_month_year",
      newValue ? format(newValue, "yyyy-MM") : null
    );
    setIsDatePickerOpen(false);
  };

  return (
    <Accordion
      sx={{
        backgroundColor: colors.surface,
        color: colors.textLight,
        mb: 2,
        "&:before": { display: "none" },
        "& .MuiAccordionSummary-root": {
          backgroundColor: colors.deep,
          color: "primary.main",
          fontWeight: "bold",
        },
        "& .MuiAccordionSummary-expandIconWrapper": { color: "primary.main" },
        "& .MuiAccordionDetails-root": {
          backgroundColor: colors.panel,
          padding: "16px",
        },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1" fontWeight="bold">
          Album states (Optional)
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box display="flex" flexDirection="column" gap={2}>
          <Box display="flex" flexDirection="column" gap={2}>
            <FormControl fullWidth size="small">
              <InputLabel
                id="cover-state-label"
                sx={{
                  color: colors.textLight,
                  "&.Mui-focused": { color: "primary.main" },
                  "&.MuiInputLabel-shrink": { color: "primary.main" },
                }}
              >
                Cover state
              </InputLabel>
              <Select
                labelId="cover-state-label"
                id="cover-state-select"
                value={albumStateData.state_cover || ""}
                label="Cover state"
                onChange={(e) =>
                  onAlbumStateChange(
                    "state_cover",
                    (e.target.value as VinylStateEnum) || null
                  )
                }
                variant="outlined"
                sx={{
                  color: colors.textLight,
                  "& .MuiSelect-icon": { color: "primary.main" },
                }}
              >
                {vinylStates.map((state) => (
                  <MenuItem key={state.id} value={state.id}>
                    {state.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel
                id="record-state-label"
                sx={{
                  color: colors.textLight,
                  "&.Mui-focused": { color: "primary.main" },
                  "&.MuiInputLabel-shrink": { color: "primary.main" },
                }}
              >
                Record state
              </InputLabel>
              <Select
                labelId="record-state-label"
                id="record-state-select"
                value={albumStateData.state_record || ""}
                label="Record state"
                onChange={(e) =>
                  onAlbumStateChange(
                    "state_record",
                    (e.target.value as VinylStateEnum) || null
                  )
                }
                variant="outlined"
                sx={{
                  color: colors.textLight,
                  "& .MuiSelect-icon": { color: "primary.main" },
                }}
              >
                {vinylStates.map((state) => (
                  <MenuItem key={state.id} value={state.id}>
                    {state.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <DatePicker
            label="Acquisition month"
            value={
              albumStateData.acquisition_month_year
                ? parse(albumStateData.acquisition_month_year, "yyyy-MM", new Date())
                : null
            }
            onChange={handleDateChange}
            open={isDatePickerOpen}
            onOpen={() => setIsDatePickerOpen(true)}
            onClose={() => setIsDatePickerOpen(false)}
            views={["month", "year"]}
            slotProps={{
              textField: {
                fullWidth: true,
                size: "small",
                helperText: "Select acquisition month and year",
                onClick: () => setIsDatePickerOpen(true),
                sx: {
                  color: colors.textLight,
                  "& .MuiOutlinedInput-root": {
                    color: colors.textLight,
                    "& fieldset": { borderColor: "primary.main" },
                    "&:hover fieldset": { borderColor: colors.goldHover },
                    "&.Mui-focused fieldset": { borderColor: "primary.main" },
                    "&.Mui-disabled": {
                      color: colors.grey400,
                      "& fieldset": { borderColor: colors.grey600 },
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: colors.textLight,
                    "&.Mui-focused": { color: "primary.main" },
                    "&.Mui-disabled": { color: colors.grey600 },
                  },
                  "& .MuiFormHelperText-root": { color: colors.textMuted },
                },
              },
              popper: {
                sx: {
                  "& .MuiPaper-root": {
                    backgroundColor: colors.surface,
                    color: colors.textLight,
                  },
                  "& .MuiPickersCalendarHeader-root": { color: colors.textLight },
                  "& .MuiPickersYear-yearButton": {
                    color: colors.textLight,
                    "&.Mui-selected": { backgroundColor: "primary.main", color: colors.black },
                    "&:hover": { backgroundColor: "rgba(201, 167, 38, 0.2)" },
                  },
                  "& .MuiPickersMonth-monthButton": {
                    color: colors.textLight,
                    "&.Mui-selected": { backgroundColor: "primary.main", color: colors.black },
                    "&:hover": { backgroundColor: "rgba(201, 167, 38, 0.2)" },
                  },
                },
              },
            }}
          />
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
