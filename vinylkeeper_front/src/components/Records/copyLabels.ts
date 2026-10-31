import { format, isSameDay, parseISO } from "date-fns";
import type { CollectionAlbumCopy } from "@models/Collection";

const displayDate = (date: Date) => format(date, "d MMM yyyy");

/** "Added on 12 Oct 2026", and the day of its last change when it was edited later. */
export function copyDatesCaption(copy: Pick<CollectionAlbumCopy, "created_at" | "updated_at">): string {
  const added = parseISO(copy.created_at);
  const updated = copy.updated_at ? parseISO(copy.updated_at) : null;
  const caption = `Added on ${displayDate(added)}`;
  return updated && !isSameDay(added, updated) ? `${caption}, updated on ${displayDate(updated)}` : caption;
}
