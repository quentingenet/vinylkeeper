import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from "@mui/material";
import { useMutation, useQuery } from "@tanstack/react-query";
import { adminApiService, type AdminPlaceUpdate, type ReportedPlace } from "@services/AdminApiService";
import { atlasApiService, type PlaceTypeData } from "@services/AtlasApiService";
import { isApiError } from "@utils/apiError";

interface AdminSpotEditDialogProps {
  place: ReportedPlace | null;
  onClose: () => void;
  /** Called once saved; resolve: also close the open reports of the spot */
  onSaved: (resolve: boolean) => void;
}

type Form = {
  name: string;
  address: string;
  city: string;
  country: string;
  description: string;
  source_url: string;
  place_type_id: number;
};

function toForm(place: ReportedPlace): Form {
  return {
    name: place.name,
    address: place.address,
    city: place.city,
    country: place.country,
    description: place.description ?? "",
    source_url: place.source_url ?? "",
    place_type_id: place.place_type_id,
  };
}

/** Only what changed is sent: an untouched city does not move the pin */
function changes(place: ReportedPlace, form: Form): AdminPlaceUpdate {
  const before = toForm(place);
  const update: AdminPlaceUpdate = {};
  (["name", "address", "city", "country"] as const).forEach((key) => {
    if (form[key].trim() !== before[key]) update[key] = form[key].trim();
  });
  if (form.description.trim() !== before.description) update.description = form.description.trim() || null;
  if (form.source_url.trim() !== before.source_url) update.source_url = form.source_url.trim() || null;
  if (form.place_type_id !== before.place_type_id) update.place_type_id = form.place_type_id;
  return update;
}

/** The admin corrects a spot: published at once, without moderation. */
export default function AdminSpotEditDialog({ place, onClose, onSaved }: AdminSpotEditDialogProps) {
  const [form, setForm] = useState<Form | null>(null);

  useEffect(() => {
    if (place) setForm(toForm(place));
  }, [place]);

  const { data: placeTypes = [] } = useQuery<PlaceTypeData[]>({
    queryKey: ["place-types"],
    queryFn: () => atlasApiService.getPlaceTypes(),
    enabled: place !== null,
    staleTime: 5 * 60 * 1000,
  });

  const save = useMutation({
    mutationFn: ({ update }: { update: AdminPlaceUpdate; resolve: boolean }) =>
      adminApiService.updatePlace(place!.id, update),
    onSuccess: (_saved, { resolve }) => onSaved(resolve),
  });

  if (!place || !form) return null;
  const update = changes(place, form);
  const nothingChanged = Object.keys(update).length === 0;
  const requiredMissing = !form.name.trim() || !form.address.trim() || !form.city.trim() || !form.country.trim();
  const field = (key: keyof Omit<Form, "place_type_id">) => ({
    value: form[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value }),
    fullWidth: true,
  });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="edit-spot-title">
      <DialogTitle id="edit-spot-title">Edit spot</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label="Name" required {...field("name")} slotProps={{ htmlInput: { maxLength: 255 } }} />
          <TextField label="Address" required {...field("address")} slotProps={{ htmlInput: { maxLength: 255 } }} />
          <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
            <TextField label="City" required {...field("city")} slotProps={{ htmlInput: { maxLength: 100 } }} />
            <TextField label="Country" required {...field("country")} slotProps={{ htmlInput: { maxLength: 100 } }} />
          </Box>
          <TextField
            label="Description"
            multiline
            minRows={3}
            {...field("description")}
            slotProps={{ htmlInput: { maxLength: 600 } }}
          />
          <TextField label="Website" placeholder="https://" {...field("source_url")} />
          <TextField
            select
            label="Spot type"
            value={form.place_type_id}
            onChange={(event) => setForm({ ...form, place_type_id: Number(event.target.value) })}
            fullWidth
          >
            {(placeTypes.length ? placeTypes : [{ id: place.place_type_id, name: place.place_type ?? "" }]).map(
              (type) => (
                <MenuItem key={type.id} value={type.id}>
                  {type.name}
                </MenuItem>
              )
            )}
          </TextField>
          {(update.city !== undefined || update.country !== undefined) && (
            <Alert severity="info">The pin moves to the new city on the map.</Alert>
          )}
          {save.isError && (
            <Alert severity="error">
              {isApiError(save.error) ? save.error.message : "The spot could not be saved. Please try again."}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => save.mutate({ update, resolve: false })}
          disabled={nothingChanged || requiredMissing || save.isPending}
        >
          Save
        </Button>
        <Button
          variant="contained"
          onClick={() => save.mutate({ update, resolve: true })}
          disabled={nothingChanged || requiredMissing || save.isPending}
        >
          Save and resolve
        </Button>
      </DialogActions>
    </Dialog>
  );
}
