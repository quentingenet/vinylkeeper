import {
  Box,
  Typography,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { parse } from "date-fns";
import { vinylStates, VinylStateEnum } from "@utils/GlobalUtils";

const accordionSx = {
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
  "& .MuiAccordionDetails-root": { backgroundColor: "#2a2a2a" },
};

interface AlbumStateEditorProps {
  coverState: VinylStateEnum | null;
  discState: VinylStateEnum | null;
  purchaseDate: string;
  isOwner: boolean;
  isUpdating: boolean;
  hasAtLeastOneField: boolean;
  isDatePickerOpen: boolean;
  onCoverChange: (value: string) => void;
  onDiscChange: (value: string) => void;
  onDateChange: (newValue: Date | null) => void;
  onDatePickerOpen: () => void;
  onDatePickerClose: () => void;
  onUpdate: () => void;
}

export default function AlbumStateEditor({
  coverState,
  discState,
  purchaseDate,
  isOwner,
  isUpdating,
  hasAtLeastOneField,
  isDatePickerOpen,
  onCoverChange,
  onDiscChange,
  onDateChange,
  onDatePickerOpen,
  onDatePickerClose,
  onUpdate,
}: AlbumStateEditorProps) {
  return (
    <Accordion sx={accordionSx}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1" fontWeight="bold">
          Album states
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box display="flex" flexDirection="column" gap={2}>
          <FormControl fullWidth size="small">
            <InputLabel
              id="cover-state-label"
              sx={{
                color: "#e4e4e4",
                "&.Mui-focused": { color: "#C9A726" },
                "&.MuiInputLabel-shrink": { color: "#C9A726" },
              }}
            >
              Cover state
            </InputLabel>
            <Select
              labelId="cover-state-label"
              id="cover-state-select"
              value={coverState || ""}
              label="Cover state"
              onChange={(e) => onCoverChange(e.target.value)}
              disabled={!isOwner}
              variant="outlined"
              sx={{ color: "#fffbf9", "& .MuiSelect-icon": { color: "#C9A726" } }}
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
                color: "#e4e4e4",
                "&.Mui-focused": { color: "#C9A726" },
                "&.MuiInputLabel-shrink": { color: "#C9A726" },
              }}
            >
              Record state
            </InputLabel>
            <Select
              labelId="record-state-label"
              id="record-state-select"
              value={discState || ""}
              label="Record state"
              onChange={(e) => onDiscChange(e.target.value)}
              disabled={!isOwner}
              variant="outlined"
              sx={{ color: "#fffbf9", "& .MuiSelect-icon": { color: "#C9A726" } }}
            >
              {vinylStates.map((state) => (
                <MenuItem key={state.id} value={state.id}>
                  {state.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <DatePicker
            label="Acquisition month"
            value={purchaseDate ? parse(purchaseDate, "yyyy-MM", new Date()) : null}
            onChange={onDateChange}
            open={isDatePickerOpen}
            onOpen={() => isOwner && onDatePickerOpen()}
            onClose={onDatePickerClose}
            disabled={!isOwner}
            views={["month", "year"]}
            slotProps={{
              textField: {
                fullWidth: true,
                size: "small",
                helperText: isOwner
                  ? "Select acquisition month and year"
                  : "Read-only",
                onClick: () => isOwner && onDatePickerOpen(),
                sx: {
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
                  "& .MuiPaper-root": { backgroundColor: "#3f3f41", color: "#fffbf9" },
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

          {isOwner && (
            <Button
              variant="contained"
              onClick={onUpdate}
              disabled={isUpdating || !hasAtLeastOneField}
              sx={{
                backgroundColor: "#C9A726",
                color: "#1F1F1F",
                fontWeight: "bold",
                mt: 2,
                "&:hover": { backgroundColor: "#b38f1f" },
                "&:disabled": { backgroundColor: "#666", color: "#999" },
              }}
            >
              {isUpdating ? "Updating..." : "Update Album States"}
            </Button>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
