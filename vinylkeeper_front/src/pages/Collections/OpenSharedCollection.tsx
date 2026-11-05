import { Link as RouterLink, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@mui/material";
import { collectionApiService } from "@services/CollectionApiService";
import CollectionUnavailable from "@components/Collections/CollectionUnavailable";
import LoadingCenter from "@components/UI/LoadingCenter";
import { collectionUrl, COMMUNITY_COLLECTIONS_URL } from "@utils/GlobalUrls";
import { parseShareToken, retryCollection, unavailableReason } from "@utils/collectionAvailability";
import { queryKeys } from "@utils/queryKeys";

/** The public link of a collection, opened by a member: straight to its full page. */
export default function OpenSharedCollection() {
  const { token } = useParams<{ token: string }>();
  const shareToken = parseShareToken(token);

  const { data, error, isLoading } = useQuery({
    queryKey: queryKeys.collections.shared(shareToken ?? ""),
    queryFn: () => collectionApiService.getSharedCollection(shareToken ?? ""),
    enabled: shareToken !== null,
    retry: retryCollection,
    staleTime: 0,
    gcTime: 0,
  });

  if (isLoading) return <LoadingCenter />;
  if (data) return <Navigate to={collectionUrl(data.id)} replace />;

  return (
    <CollectionUnavailable reason={shareToken ? unavailableReason(error) : "gone"}>
      <Button component={RouterLink} to={COMMUNITY_COLLECTIONS_URL} variant="contained">
        Browse community collections
      </Button>
    </CollectionUnavailable>
  );
}
