import { isSameDay, parseISO } from "date-fns";
import type { CollectionAlbumCopy } from "@models/Collection";
import i18n, { formatDate } from "@utils/i18n";

const displayDate = (date: Date) => formatDate(date);

/** "Added on 12 Oct 2026", and the day of its last change when it was edited later. */
export function copyDatesCaption(copy: Pick<CollectionAlbumCopy, "created_at" | "updated_at">): string {
  const added = parseISO(copy.created_at);
  const updated = copy.updated_at ? parseISO(copy.updated_at) : null;
  const caption = i18n.t("records:copy.addedOn", { date: displayDate(added) });
  return updated && !isSameDay(added, updated)
    ? i18n.t("records:copy.updatedOn", { caption, date: displayDate(updated) })
    : caption;
}
