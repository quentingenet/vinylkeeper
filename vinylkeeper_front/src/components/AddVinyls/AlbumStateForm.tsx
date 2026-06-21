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
        backgroundColor: "#3f3f41",
        color: "#fffbf9",
        mb: 2,
        "&:before": { display: "none" },
        "& .MuiAccordionSummary-root": {
          backgroundColor: "#1F1F1F",
          color: "#C9A726",
          fontWeight: "bold",
        },
        "& .MuiAccordionSummary-expandIconWrapper": { color: "#C9A726" },
        "& .MuiAccordionDetails-root": {
          backgroundColor: "#2a2a2a",
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
                  color: "#fffbf9",
                  "&.Mui-focused": { color: "#C9A726" },
                  "&.MuiInputLabel-shrink": { color: "#C9A726" },
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
                  color: "#fffbf9",
                  "& .MuiSelect-icon": { color: "#C9A726" },
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
                  color: "#fffbf9",
                  "&.Mui-focused": { color: "#C9A726" },
                  "&.MuiInputLabel-shrink": { color: "#C9A726" },
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
                  color: "#fffbf9",
                  "& .MuiSelect-icon": { color: "#C9A726" },
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
                  color: "#fffbf9",
                  "& .MuiOutlinedInput-root": {
                    color: "#fffbf9",
                    "& fieldset": { borderColor: "#C9A726" },
                    "&:hover fieldset": { borderColor: "#b38f1f" },
                    "&.Mui-focused fieldset": { borderColor: "#C9A726" },
                    "&.Mui-disabled": {
                      color: "#999",
                      "& fieldset": { borderColor: "#666" },
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "#fffbf9",
                    "&.Mui-focused": { color: "#C9A726" },
                    "&.Mui-disabled": { color: "#666" },
                  },
                  "& .MuiFormHelperText-root": { color: "#e4e4e4" },
                },
              },
              popper: {
                sx: {
                  "& .MuiPaper-root": {
                    backgroundColor: "#3f3f41",
                    color: "#fffbf9",
                  },
                  "& .MuiPickersCalendarHeader-root": { color: "#fffbf9" },
                  "& .MuiPickersYear-yearButton": {
                    color: "#fffbf9",
                    "&.Mui-selected": { backgroundColor: "#C9A726", color: "#000" },
                    "&:hover": { backgroundColor: "rgba(201, 167, 38, 0.2)" },
                  },
                  "& .MuiPickersMonth-monthButton": {
                    color: "#fffbf9",
                    "&.Mui-selected": { backgroundColor: "#C9A726", color: "#000" },
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
