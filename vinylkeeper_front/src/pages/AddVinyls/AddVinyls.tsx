import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Box, Button } from "@mui/material";
import RequestsMaker from "@components/AddVinyls/RequestsMaker";
import RequestResults from "@components/AddVinyls/RequestResults";
import ReplacePressingDialog from "@components/AddVinyls/ReplacePressingDialog";
import { useMusicSearch } from "@hooks/useMusicSearch";
import { useReplacePressing } from "@hooks/useReplacePressing";
import type { IAlbumRequestResults } from "@models/IRequestProxy";
import { collectionDetailsUrl, parseInitialQuery, parseReplaceTarget } from "@utils/findPressing";

export default function AddVinyls() {
  const { results, isSearching, isChangingPage, error, search, goToPage } = useMusicSearch();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = parseInitialQuery(searchParams);
  const replaceTarget = useMemo(() => parseReplaceTarget(searchParams), [searchParams]);
  const replacePressing = useReplacePressing(replaceTarget);
  const [pickedPressing, setPickedPressing] = useState<IAlbumRequestResults | null>(null);

  // Opened with a query (from "Find my pressing"): its pressings are listed right away
  useEffect(() => {
    if (initialQuery) search(initialQuery, false);
  }, [initialQuery, search]);

  const handlePageChange = (page: number) => {
    goToPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const backToCollection = () => {
    if (replaceTarget) void navigate(collectionDetailsUrl(replaceTarget.collectionId));
  };

  const handleConfirmPressing = async () => {
    if (!pickedPressing) return;
    try {
      await replacePressing.mutateAsync(pickedPressing);
      backToCollection();
    } catch {
      // Shown in the dialog
    }
  };

  return (
    <>
      <RequestsMaker
        initialQuery={initialQuery}
        hasResults={!!results}
        isSearching={isSearching}
        error={error}
        onSearch={search}
      />
      {replaceTarget && (
        <Box sx={{ display: "flex", justifyContent: "center", px: 2, mt: 2 }}>
          <Alert
            severity="info"
            sx={{ maxWidth: 600, width: "100%", boxSizing: "border-box" }}
            action={
              <Button color="inherit" size="small" onClick={backToCollection}>
                Cancel
              </Button>
            }
          >
            Pick the pressing on your shelf{replaceTarget.title ? ` for “${replaceTarget.title}”` : ""}.
          </Alert>
        </Box>
      )}
      {results && (
        <RequestResults
          isArtist={results.isArtist}
          items={results.items}
          page={results.page}
          totalPages={results.total_pages}
          onPageChange={handlePageChange}
          isChangingPage={isChangingPage}
          onPickPressing={replaceTarget ? setPickedPressing : undefined}
        />
      )}
      <ReplacePressingDialog
        pressing={pickedPressing}
        albumTitle={replaceTarget?.title ?? ""}
        isPending={replacePressing.isPending}
        error={replacePressing.isError ? "Could not replace the pressing. Please try again." : undefined}
        onConfirm={() => void handleConfirmPressing()}
        onCancel={() => {
          setPickedPressing(null);
          replacePressing.reset();
        }}
      />
    </>
  );
}
