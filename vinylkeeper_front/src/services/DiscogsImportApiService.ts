import { BaseApiService } from "./BaseApiService";
import type { DiscogsImport, DiscogsImportPreview } from "@models/IDiscogsImport";

export class DiscogsImportApiService extends BaseApiService {
  async preview(discogsUsername: string): Promise<DiscogsImportPreview> {
    const params = new URLSearchParams({ discogs_username: discogsUsername });
    return this.get<DiscogsImportPreview>(`/discogs-import/preview?${params.toString()}`);
  }

  /** collectionId null: a new collection is created for the records; saveCopy: an existing one is saved first */
  async start(discogsUsername: string, collectionId: number | null, saveCopy: boolean): Promise<DiscogsImport> {
    return this.post<DiscogsImport>("/discogs-import/", {
      discogs_username: discogsUsername,
      collection_id: collectionId,
      save_copy: saveCopy,
    });
  }

  /** The latest import of the user, null if none */
  async latest(): Promise<DiscogsImport | null> {
    return this.get<DiscogsImport | null>("/discogs-import/latest");
  }
}

export const discogsImportApiService = new DiscogsImportApiService();
