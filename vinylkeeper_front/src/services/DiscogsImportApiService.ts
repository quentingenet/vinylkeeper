import { BaseApiService } from "./BaseApiService";
import type { DiscogsConnection, DiscogsImport, DiscogsImportPreview } from "@models/IDiscogsImport";

export class DiscogsImportApiService extends BaseApiService {
  /** The Discogs account the user connected, if any. Tokens never leave the server. */
  async connection(): Promise<DiscogsConnection> {
    return this.get<DiscogsConnection>("/discogs-import/connection");
  }

  /** The Discogs page where the user authorizes VinylKeeper; Discogs then sends them back to the app */
  async connect(): Promise<string> {
    return (await this.post<{ authorize_url: string }>("/discogs-import/connect")).authorize_url;
  }

  async disconnect(): Promise<void> {
    return this.delete<void>("/discogs-import/connection");
  }

  /** Sizes of the connected account's collection and wantlist */
  async preview(): Promise<DiscogsImportPreview> {
    return this.get<DiscogsImportPreview>("/discogs-import/preview");
  }

  /** collectionId null: a new collection is created for the records; saveCopy: an existing one is saved first */
  async start(collectionId: number | null, saveCopy: boolean, includeWantlist: boolean): Promise<DiscogsImport> {
    return this.post<DiscogsImport>("/discogs-import/", {
      collection_id: collectionId,
      save_copy: saveCopy,
      include_wantlist: includeWantlist,
    });
  }

  /** The latest import of the user, null if none */
  async latest(): Promise<DiscogsImport | null> {
    return this.get<DiscogsImport | null>("/discogs-import/latest");
  }
}

export const discogsImportApiService = new DiscogsImportApiService();
