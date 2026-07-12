import { logger } from "@utils/logger";
import type { LatestAddition } from "@models/IDashboardStats";
import type { PlaybackItem } from "@components/Modals/PlaybackModal";

export function toPlaybackItem(
  addition: LatestAddition | undefined,
  type: "album" | "artist"
): PlaybackItem | null {
  if (!addition) return null;

  const externalId = addition.external_id
    ? addition.external_id
    : addition.id.toString();

  // Validate that external ID is numeric
  if (!/^\d+$/.test(externalId)) {
    logger.warn(
      `Non-numeric external ID for ${type}:`,
      externalId,
      addition
    );
    return null;
  }

  // Album titles are stored as "Artist - Title" (same convention as
  // MediaCard.tsx and the backend's export_service._split_album_title).
  const artist =
    type === "album" ? addition.name.split(" - ")[0] || "" : addition.name;

  return {
    id: externalId,
    title: addition.name,
    artist,
    image_url: addition.image_url,
    itemType: type,
  };
}
