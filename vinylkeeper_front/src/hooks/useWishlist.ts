import { useQuery, useQueryClient } from "@tanstack/react-query";
import { externalReferenceApiService } from "@services/ExternalReferenceService";
import type {
  PaginatedWishlistResponse,
  WishlistItemResponse,
} from "@models/IExternalReference";
import { HTTPError } from "ky";
import { useUserContext } from "@contexts/UserContext";

interface UseWishlistReturn {
  wishlistItems: PaginatedWishlistResponse["items"];
  totalPages: number;
  total: number;
  wishlistLoading: boolean;
  error: HTTPError | null;
  isError: boolean;
  refreshWishlist: () => void;
}

export const useWishlist = (
  page: number = 1,
  itemsPerPage: number = 8,
  enabled: boolean = true,
  userId?: number
): UseWishlistReturn => {
  const queryClient = useQueryClient();
  const { currentUser } = useUserContext();

  const cacheKey = userId
    ? ["wishlist", userId, page]
    : ["wishlist", currentUser?.user_uuid, page];

  const {
    data: wishlistData,
    isLoading: wishlistLoading,
    error,
    isError,
  } = useQuery<PaginatedWishlistResponse, HTTPError>({
    queryKey: cacheKey,
    queryFn: () =>
      externalReferenceApiService.getUserWishlistPaginated(
        page,
        itemsPerPage,
        userId
      ),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
    enabled: enabled && (!!userId || !!currentUser?.user_uuid),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
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
        queryKey: userId ? ["wishlist", userId] : ["wishlist"],
      });
    },
  };
};

interface UseWishlistItemDetailReturn {
  wishlistItem: WishlistItemResponse | undefined;
  isLoading: boolean;
  error: HTTPError | null;
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
  } = useQuery<WishlistItemResponse, HTTPError>({
    queryKey: ["wishlistItem", wishlistId],
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
