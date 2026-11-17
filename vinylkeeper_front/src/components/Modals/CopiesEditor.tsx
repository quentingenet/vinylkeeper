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
import { vinylStates, vinylStateLabel, VinylStateEnum } from "@utils/GlobalUtils";
import { formatDate } from "@utils/i18n";
import { colors } from "@styles/colors";
import { useTranslation } from "react-i18next";

const stateName = (state?: VinylStateEnum | null) => {
  const found = vinylStates.find((s) => s.id === state);
  return found ? vinylStateLabel(found) : "";
};
// "2024-05" as "May 2024" in the locale of the device
const acquisitionLabel = (month: string) => formatDate(parse(month, "yyyy-MM", new Date()), { month: "short", year: "numeric" });

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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mt: 1 }}>
      {chips.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {chips.map((chip) => (
            <Chip key={chip.key} label={chip.label} size="small" variant="outlined" sx={{ color: colors.textMuted }} />
          ))}
        </Box>
      )}
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
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
            {vinylStateLabel(state)}
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
  const { t } = useTranslation("records");
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
      copy.state_record && t("copies.record", { state: stateName(copy.state_record) }),
      copy.state_cover && t("copies.cover", { state: stateName(copy.state_cover) }),
      copy.acquisition_month_year && t("copies.acquired", { date: acquisitionLabel(copy.acquisition_month_year) }),
    ].filter((detail): detail is string => Boolean(detail));
    return (
      <Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.5 }}>
          <Typography variant="body2" sx={{ color: "text.primary", mr: 0.5 }}>
            {t("copies.copyNumber", { number })}
          </Typography>
          {details.length > 0 ? (
            details.map((detail) => <Chip key={detail} label={detail} size="small" variant="outlined" />)
          ) : (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("copies.noCondition")}
            </Typography>
          )}
        </Box>
        <CopyFooter copy={copy} edition={edition} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1.5, borderRadius: 1, backgroundColor: colors.panel }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="body2" sx={{ color: "text.primary", fontWeight: "bold" }}>
          {t("copies.copyNumber", { number })}
        </Typography>
        {canDelete && !isConfirmingDelete && (
          <IconButton
            size="small"
            aria-label={t("copies.deleteAria", { number })}
            onClick={() => setIsConfirmingDelete(true)}
            disabled={isBusy}
          >
            <DeleteIcon fontSize="small" sx={{ color: colors.textMuted }} />
          </IconButton>
        )}
      </Box>
      {isConfirmingDelete ? (
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
          <Typography variant="body2" sx={{ color: "text.primary" }}>
            {t("copies.deleteConfirm")}
          </Typography>
          <Button size="small" variant="contained" color="error" onClick={onDelete} disabled={isBusy}>
            {t("common:actions.delete")}
          </Button>
          <Button size="small" onClick={() => setIsConfirmingDelete(false)} disabled={isBusy}>
            {t("copies.keep")}
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <StateSelect id={`record-${copy.id}`} label={t("state.record")} value={record} onChange={setRecord} />
          <StateSelect id={`cover-${copy.id}`} label={t("state.cover")} value={cover} onChange={setCover} />
          <DatePicker
            label={t("state.acquisition")}
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
              {t("copies.save", { number })}
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
  const { t } = useTranslation("records");
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
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" sx={{ color: "primary.main", mb: 1 }}>
        {copies.length > 1 ? t("copies.titleMany", { count: copies.length }) : t("copies.title")}
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
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
          {t("copies.add")}
        </Button>
      )}
      {hasError && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          {t("copies.saveFailed")}
        </Typography>
      )}
    </Box>
  );
}
