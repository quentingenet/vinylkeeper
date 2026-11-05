import { isApiError } from "@utils/apiError";

const NOT_FOUND_CODE = 2000;
const FORBIDDEN_CODE = 4003;
// The id column of the API: a longer number in a link is no collection
const MAX_COLLECTION_ID = 2147483647;

export type CollectionUnavailableReason = "private" | "gone" | "error";

/** Why a collection cannot be shown: anything but a clear answer of the API may be temporary. */
export const unavailableReason = (error: unknown): CollectionUnavailableReason => {
  if (isApiError(error) && error.code === FORBIDDEN_CODE) return "private";
  if (isApiError(error) && error.code === NOT_FOUND_CODE) return "gone";
  return "error";
};

/** The id of a collection in a URL, null when it cannot be one. */
export const parseCollectionId = (value: string | undefined): number | null => {
  if (!value || !/^[1-9]\d{0,9}$/.test(value)) return null;
  const id = Number(value);
  return id <= MAX_COLLECTION_ID ? id : null;
};

/** The key of a public link, null when it cannot be one: no need to ask the API. */
export const parseShareToken = (value: string | undefined): string | null =>
  value && /^[0-9a-f]{32}$/.test(value) ? value : null;

/** Private or deleted is an answer, trying again would only delay it. */
export const retryCollection = (failureCount: number, error: unknown) =>
  unavailableReason(error) === "error" && failureCount < 1;
