import { EGlobalUrls } from "@utils/GlobalUrls";

// An album of a collection whose release is not the pressing on the owner's shelf
export interface ReplaceTarget {
  collectionId: number;
  albumId: number;
  title: string;
}

const COLLECTION_PARAM = "replaceCollection";
const ALBUM_PARAM = "replaceAlbum";
const QUERY_PARAM = "q";

export function buildFindPressingUrl({ collectionId, albumId, title }: ReplaceTarget): string {
  const params = new URLSearchParams({
    [QUERY_PARAM]: title,
    [COLLECTION_PARAM]: String(collectionId),
    [ALBUM_PARAM]: String(albumId),
  });
  return `${EGlobalUrls.ADD_VINYLS}?${params.toString()}`;
}

export function parseInitialQuery(params: URLSearchParams): string {
  return params.get(QUERY_PARAM)?.trim() ?? "";
}

export function parseReplaceTarget(params: URLSearchParams): ReplaceTarget | null {
  const collectionId = Number(params.get(COLLECTION_PARAM));
  const albumId = Number(params.get(ALBUM_PARAM));
  const title = parseInitialQuery(params);
  if (!Number.isInteger(collectionId) || collectionId <= 0 || !Number.isInteger(albumId) || albumId <= 0) {
    return null;
  }
  return { collectionId, albumId, title };
}

export const collectionDetailsUrl = (collectionId: number) =>
  EGlobalUrls.COLLECTION_DETAILS.replace(":id", String(collectionId));
