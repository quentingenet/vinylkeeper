import { useState, useEffect } from "react";
import { useCollectionLike } from "@hooks/useCollectionLike";

interface UseLikeButtonOptions {
  collectionId: number;
  initialIsLiked: boolean;
  initialLikesCount: number;
}

export function useLikeButton({
  collectionId,
  initialIsLiked,
  initialLikesCount,
}: UseLikeButtonOptions) {
  const [localIsLiked, setLocalIsLiked] = useState(initialIsLiked);
  const [localLikesCount, setLocalLikesCount] = useState(initialLikesCount);
  const [likeBounce, setLikeBounce] = useState(false);
  const [likeCooldown, setLikeCooldown] = useState(false);

  const { like, unlike, isLiking, isUnliking, likeError, unlikeError } =
    useCollectionLike(collectionId);

  // Sync state when a different collection is rendered in this slot
  useEffect(() => {
    setLocalIsLiked(initialIsLiked);
    setLocalLikesCount(initialLikesCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId]);

  // Revert optimistic update on error
  useEffect(() => {
    if (likeError || unlikeError) {
      setLocalIsLiked(initialIsLiked);
      setLocalLikesCount(initialLikesCount);
    }
  }, [likeError, unlikeError, initialIsLiked, initialLikesCount]);

  // Bounce animation on count change
  useEffect(() => {
    if (likeBounce) return;
    setLikeBounce(true);
    const timeout = setTimeout(() => setLikeBounce(false), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localLikesCount]);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiking || isUnliking || likeCooldown) return;

    setLikeCooldown(true);
    setTimeout(() => setLikeCooldown(false), 1000);

    if (localIsLiked) {
      setLocalIsLiked(false);
      setLocalLikesCount((prev) => Math.max(0, prev - 1));
      unlike();
    } else {
      setLocalIsLiked(true);
      setLocalLikesCount((prev) => prev + 1);
      like();
    }
  };

  return {
    localIsLiked,
    localLikesCount,
    likeBounce,
    isLiking,
    isUnliking,
    likeCooldown,
    handleLikeClick,
  };
}
