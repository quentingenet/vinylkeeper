import { useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { CollectionAlbumResponse } from "@models/Collection";
import { useConfirmAlbumPressing } from "@hooks/useCollections";
import type { Edition } from "@components/Records/editionLabels";
import PressingSection from "@components/Modals/PressingSection";
import CopiesEditor from "@components/Modals/CopiesEditor";
import { pressingTitle, storedEdition } from "@utils/collectionRecords";
import { colors } from "@styles/colors";

const accordionSx = {
  backgroundColor: colors.surface,
  color: colors.textLight,
  mb: 1,
  "&:before": { display: "none" },
  "& .MuiAccordionSummary-root": { backgroundColor: colors.deep },
  "& .MuiAccordionSummary-expandIconWrapper": { color: "primary.main" },
  "& .MuiAccordionDetails-root": { backgroundColor: colors.panel },
};

interface CollectionPressingsProps {
  collectionId: number;
  pressings: CollectionAlbumResponse[];
  canEdit: boolean;
  // Live details of the release when there is a single pressing (always complete, even before enrichment)
  liveEdition?: Edition;
  onFindPressing: (pressing: CollectionAlbumResponse) => void;
  onRemovePressing?: (pressing: CollectionAlbumResponse) => void;
}

export default function CollectionPressings({
  collectionId,
  pressings: initialPressings,
  canEdit,
  liveEdition,
  onFindPressing,
  onRemovePressing,
}: CollectionPressingsProps) {
  const [pressings, setPressings] = useState(initialPressings);
  const confirmPressing = useConfirmAlbumPressing();

  const replace = (updated: CollectionAlbumResponse) =>
    setPressings((current) => current.map((p) => (p.id === updated.id ? updated : p)));

  const confirm = (pressing: CollectionAlbumResponse) => {
    confirmPressing
      .mutateAsync({ collectionId, albumId: pressing.id })
      .then(replace)
      .catch(() => undefined);
  };

  const details = (pressing: CollectionAlbumResponse, edition: Edition) => (
    <>
      <PressingSection
        edition={edition}
        releaseId={pressing.external_album_id}
        confirmed={pressing.pressing_confirmed ?? false}
        canConfirm={canEdit}
        isConfirming={confirmPressing.isPending}
        onConfirm={() => confirm(pressing)}
        onFindPressing={() => onFindPressing(pressing)}
      />
      <CopiesEditor
        collectionId={collectionId}
        pressing={pressing}
        edition={edition}
        canEdit={canEdit}
        onPressingChange={replace}
      />
    </>
  );

  if (pressings.length === 1) {
    return <Box mb={1}>{details(pressings[0], liveEdition ?? storedEdition(pressings[0]))}</Box>;
  }

  return (
    <Box mb={3}>
      <Typography variant="subtitle1" sx={{ color: "primary.main", mb: 1 }}>
        Pressings in this collection ({pressings.length})
      </Typography>
      {pressings.map((pressing, index) => {
        const copies = pressing.copies_count ?? pressing.copies?.length ?? 1;
        return (
          <Accordion key={pressing.id} sx={accordionSx} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" sx={{ color: "text.primary", fontWeight: "bold" }}>
                {pressingTitle(pressing, index + 1)}
                {copies > 1 ? `  ×${copies}` : ""}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {details(pressing, storedEdition(pressing))}
              {canEdit && onRemovePressing && (
                <Button size="small" color="error" onClick={() => onRemovePressing(pressing)}>
                  Remove this pressing from the collection
                </Button>
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}
