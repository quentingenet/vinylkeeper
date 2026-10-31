import { useState } from "react";
import { Box, Button, Chip, FormControl, IconButton, InputLabel, MenuItem, Select, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { format, parse } from "date-fns";
import type { CollectionAlbumCopy, CollectionAlbumCopyData, CollectionAlbumResponse } from "@models/Collection";
import { useAlbumCopies } from "@hooks/useCollections";
import { editionChips, type Edition } from "@components/Records/editionLabels";
import { copyDatesCaption } from "@components/Records/copyLabels";
import { vinylStates, VinylStateEnum } from "@utils/GlobalUtils";
import { colors } from "@styles/colors";

const stateName = (state?: VinylStateEnum | null) => vinylStates.find((s) => s.id === state)?.name ?? "";

const selectLabelSx = {
  color: colors.textMuted,
  "&.Mui-focused": { color: "primary.main" },
  "&.MuiInputLabel-shrink": { color: "primary.main" },
};

const datePickerSlotProps = {
  textField: {
    fullWidth: true,
    size: "small" as const,
    sx: {
      "& .MuiOutlinedInput-root": {
        color: colors.textLight,
        "& fieldset": { borderColor: "primary.main" },
        "&:hover fieldset": { borderColor: colors.goldHover },
        "&.Mui-focused fieldset": { borderColor: "primary.main" },
      },
      "& .MuiInputLabel-root": { color: colors.textLight, "&.Mui-focused": { color: "primary.main" } },
    },
  },
  popper: {
    sx: {
      "& .MuiPaper-root": { backgroundColor: colors.surface, color: colors.textLight },
      "& .MuiPickersCalendarHeader-root": { color: colors.textLight },
      "& .MuiPickersYear-yearButton, & .MuiPickersMonth-monthButton": {
        color: colors.textLight,
        "&.Mui-selected": { backgroundColor: "primary.main", color: colors.black },
        "&:hover": { backgroundColor: "rgba(201, 167, 38, 0.2)" },
      },
    },
  },
};

// Pressing of the copy and when it was added, under the condition
function CopyFooter({ copy, edition }: { copy: CollectionAlbumCopy; edition?: Edition }) {
  const chips = edition ? editionChips(edition) : [];
  return (
    <Box display="flex" flexDirection="column" gap={0.5} mt={1}>
      {chips.length > 0 && (
        <Box display="flex" flexWrap="wrap" gap={0.5}>
          {chips.map((chip) => (
            <Chip key={chip.key} label={chip.label} size="small" variant="outlined" sx={{ color: colors.textMuted }} />
          ))}
        </Box>
      )}
      <Typography variant="caption" color="text.secondary">
        {copyDatesCaption(copy)}
      </Typography>
    </Box>
  );
}

interface StateSelectProps {
  id: string;
  label: string;
  value: VinylStateEnum | null;
  onChange: (value: VinylStateEnum | null) => void;
}

function StateSelect({ id, label, value, onChange }: StateSelectProps) {
  return (
    <FormControl fullWidth size="small">
      <InputLabel id={`${id}-label`} sx={selectLabelSx}>
        {label}
      </InputLabel>
      <Select
        labelId={`${id}-label`}
        id={id}
        value={value ?? ""}
        label={label}
        onChange={(e) => onChange((e.target.value as VinylStateEnum) || null)}
        sx={{ color: colors.textLight, "& .MuiSelect-icon": { color: "primary.main" } }}
      >
        {vinylStates.map((state) => (
          <MenuItem key={state.id} value={state.id}>
            {state.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

interface CopyRowProps {
  copy: CollectionAlbumCopy;
  number: number;
  edition?: Edition;
  canEdit: boolean;
  canDelete: boolean;
  isBusy: boolean;
  onSave: (data: CollectionAlbumCopyData) => void;
  onDelete: () => void;
}

function CopyRow({ copy, number, edition, canEdit, canDelete, isBusy, onSave, onDelete }: CopyRowProps) {
  const [record, setRecord] = useState<VinylStateEnum | null>(copy.state_record ?? null);
  const [cover, setCover] = useState<VinylStateEnum | null>(copy.state_cover ?? null);
  const [acquired, setAcquired] = useState<string>(copy.acquisition_month_year ?? "");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const isDirty =
    record !== (copy.state_record ?? null) ||
    cover !== (copy.state_cover ?? null) ||
    acquired !== (copy.acquisition_month_year ?? "");

  if (!canEdit) {
    const details = [
      copy.state_record && `Record: ${stateName(copy.state_record)}`,
      copy.state_cover && `Cover: ${stateName(copy.state_cover)}`,
      copy.acquisition_month_year && `Acquired: ${copy.acquisition_month_year}`,
    ].filter((detail): detail is string => Boolean(detail));
    return (
      <Box>
        <Box display="flex" flexWrap="wrap" alignItems="center" gap={0.5}>
          <Typography variant="body2" sx={{ color: "text.primary", mr: 0.5 }}>
            Copy {number}
          </Typography>
          {details.length > 0 ? (
            details.map((detail) => <Chip key={detail} label={detail} size="small" variant="outlined" />)
          ) : (
            <Typography variant="body2" color="text.secondary">
              No condition given
            </Typography>
          )}
        </Box>
        <CopyFooter copy={copy} edition={edition} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1.5, borderRadius: 1, backgroundColor: colors.panel }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="body2" sx={{ color: "text.primary", fontWeight: "bold" }}>
          Copy {number}
        </Typography>
        {canDelete && !isConfirmingDelete && (
          <IconButton
            size="small"
            aria-label={`Delete copy ${number}`}
            onClick={() => setIsConfirmingDelete(true)}
            disabled={isBusy}
          >
            <DeleteIcon fontSize="small" sx={{ color: colors.textMuted }} />
          </IconButton>
        )}
      </Box>
      {isConfirmingDelete ? (
        <Box display="flex" flexWrap="wrap" alignItems="center" gap={1}>
          <Typography variant="body2" sx={{ color: "text.primary" }}>
            Delete this copy?
          </Typography>
          <Button size="small" variant="contained" color="error" onClick={onDelete} disabled={isBusy}>
            Delete
          </Button>
          <Button size="small" onClick={() => setIsConfirmingDelete(false)} disabled={isBusy}>
            Keep it
          </Button>
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" gap={1.5}>
          <StateSelect id={`record-${copy.id}`} label="Record state" value={record} onChange={setRecord} />
          <StateSelect id={`cover-${copy.id}`} label="Cover state" value={cover} onChange={setCover} />
          <DatePicker
            label="Acquisition month"
            value={acquired ? parse(acquired, "yyyy-MM", new Date()) : null}
            onChange={(date) => setAcquired(date ? format(date, "yyyy-MM") : "")}
            views={["month", "year"]}
            slotProps={datePickerSlotProps}
          />
          {isDirty && (
            <Button
              variant="contained"
              size="small"
              disabled={isBusy}
              onClick={() =>
                onSave({ state_record: record, state_cover: cover, acquisition_month_year: acquired || null })
              }
            >
              Save copy {number}
            </Button>
          )}
        </Box>
      )}
      <CopyFooter copy={copy} edition={edition} />
    </Box>
  );
}

interface CopiesEditorProps {
  collectionId: number;
  pressing: CollectionAlbumResponse;
  // Pressing details shown on each copy
  edition?: Edition;
  canEdit: boolean;
  onPressingChange: (pressing: CollectionAlbumResponse) => void;
}

export default function CopiesEditor({ collectionId, pressing, edition, canEdit, onPressingChange }: CopiesEditorProps) {
  const { addCopy, updateCopy, deleteCopy } = useAlbumCopies(collectionId);
  const copies = pressing.copies ?? [];
  const isBusy = addCopy.isPending || updateCopy.isPending || deleteCopy.isPending;
  const hasError = addCopy.isError || updateCopy.isError || deleteCopy.isError;

  // Every call answers the album with all its copies: the modal shows it right away
  const apply = (request: Promise<CollectionAlbumResponse>) => {
    request.then(onPressingChange).catch(() => undefined);
  };

  if (!canEdit && copies.length === 0) return null;

  return (
    <Box mb={2}>
      <Typography variant="subtitle1" sx={{ color: "primary.main", mb: 1 }}>
        {copies.length > 1 ? `Copies (${copies.length})` : "Copy"}
      </Typography>
      <Box display="flex" flexDirection="column" gap={1.5}>
        {copies.map((copy, index) => (
          <CopyRow
            // Remount when saved: the row starts again from what the API answered
            key={`${copy.id}-${copy.state_record}-${copy.state_cover}-${copy.acquisition_month_year}`}
            copy={copy}
            number={index + 1}
            edition={edition}
            canEdit={canEdit}
            canDelete={copies.length > 1}
            isBusy={isBusy}
            onSave={(data) => apply(updateCopy.mutateAsync({ albumId: pressing.id, copyId: copy.id, data }))}
            onDelete={() => apply(deleteCopy.mutateAsync({ albumId: pressing.id, copyId: copy.id }))}
          />
        ))}
      </Box>
      {canEdit && (
        <Button
          size="small"
          startIcon={<AddIcon />}
          sx={{ mt: 1 }}
          disabled={isBusy}
          onClick={() => apply(addCopy.mutateAsync({ albumId: pressing.id, data: {} }))}
        >
          Add a copy
        </Button>
      )}
      {hasError && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          Could not save the copies. Please try again.
        </Typography>
      )}
    </Box>
  );
}
