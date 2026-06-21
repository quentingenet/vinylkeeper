import { useQuery, useQueryClient } from "@tanstack/react-query";
import { externalReferenceApiService } from "@services/ExternalReferenceService";
import { queryKeys } from "@utils/queryKeys";
import type {
  PaginatedWishlistResponse,
  WishlistItemResponse,
} from "@models/IExternalReference";
import { type ApiError } from "@utils/apiError";
import { useUserContext } from "@contexts/UserContext";

interface UseWishlistReturn {
  wishlistItems: PaginatedWishlistResponse["items"];
  totalPages: number;
  total: number;
  wishlistLoading: boolean;
  error: ApiError | null;
  isError: boolean;
  refreshWishlist: () => void;
}

export const useWishlist = (
  page: number = 1,
  itemsPerPage: number = 8,
  enabled: boolean = true,
  userUuid?: string,
  sortOrder: string = "newest",
  search?: string
): UseWishlistReturn => {
  const queryClient = useQueryClient();
  const { currentUser } = useUserContext();

  const cacheKey = queryKeys.wishlist.forUserPage(
    userUuid ?? currentUser?.user_uuid,
    page,
    sortOrder,
    search
  );

  const {
    data: wishlistData,
    isLoading: wishlistLoading,
    error,
    isError,
  } = useQuery<PaginatedWishlistResponse, ApiError>({
    queryKey: cacheKey,
    queryFn: () =>
      externalReferenceApiService.getUserWishlistPaginated(
        page,
        itemsPerPage,
        userUuid,
        sortOrder,
        search
      ),
    staleTime: 0,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
    enabled: enabled && (!!userUuid || !!currentUser?.user_uuid),
    refetchOnWindowFocus: false,
  });

  return {
    wishlistItems: wishlistData?.items || [],
    totalPages: wishlistData?.total_pages || 0,
    total: wishlistData?.total || 0,
    wishlistLoading,
    error: error || null,
    isError,
    refreshWishlist: () => {
      void queryClient.invalidateQueries({
        queryKey: userUuid ? queryKeys.wishlist.forUser(userUuid) : queryKeys.wishlist.all(),
      });
    },
  };
};

interface UseWishlistItemDetailReturn {
  wishlistItem: WishlistItemResponse | undefined;
  isLoading: boolean;
  error: ApiError | null;
  isError: boolean;
}

export const useWishlistItemDetail = (
  wishlistId: number | null,
  enabled: boolean = true
): UseWishlistItemDetailReturn => {
  const {
    data: wishlistItem,
    isLoading,
    error,
    isError,
  } = useQuery<WishlistItemResponse, ApiError>({
    queryKey: queryKeys.wishlist.item(wishlistId),
    queryFn: () =>
      externalReferenceApiService.getWishlistItemDetail(wishlistId!),
    enabled: enabled && wishlistId !== null,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return {
    wishlistItem,
    isLoading,
    error: error || null,
    isError,
  };
};
