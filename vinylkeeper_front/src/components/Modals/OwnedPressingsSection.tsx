import { Box, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { externalReferenceApiService } from "@services/ExternalReferenceService";
import EditionChips from "@components/Records/EditionChips";
import type { OwnedPressing } from "@models/IExternalReference";
import { queryKeys } from "@utils/queryKeys";

const edition = (owned: OwnedPressing) => ({
  year: owned.release_year ? String(owned.release_year) : null,
  country: owned.country,
  label: owned.label,
  catno: owned.catno,
  formats: owned.formats,
});

interface OwnedPressingsSectionProps {
  externalId: string;
  masterId: string | null;
}

/** The pressings of this work on the user's shelves, collection by collection, with their copies. */
export default function OwnedPressingsSection({ externalId, masterId }: OwnedPressingsSectionProps) {
  const { data: owned = [] } = useQuery({
    queryKey: queryKeys.ownedPressings(externalId),
    queryFn: () => externalReferenceApiService.findOwnedPressings(externalId, masterId),
    staleTime: 60 * 1000,
  });

  if (owned.length === 0) return null;

  return (
    <Box mb={3}>
      <Typography variant="subtitle1" sx={{ color: "primary.main", mb: 1 }}>
        {owned.length > 1 ? "Your pressings" : "Your pressing"}
      </Typography>
      <Box display="flex" flexDirection="column" gap={1.5}>
        {owned.map((pressing) => (
          <Box key={`${pressing.collection_id}-${pressing.album_id}`}>
            <Typography variant="body2" sx={{ color: "text.primary", mb: 0.5 }}>
              {pressing.collection_name}
              {pressing.copies_count > 1 ? `  ×${pressing.copies_count}` : ""}
            </Typography>
            <EditionChips album={edition(pressing)} centered={false} />
            {!pressing.pressing_confirmed && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Pressing not confirmed yet: open it from your collection to check it.
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
