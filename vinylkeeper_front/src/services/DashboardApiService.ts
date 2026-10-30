import { BaseApiService } from "./BaseApiService";
import { CollectionBreakdown, IDashboardStats } from "@models/IDashboardStats";

export class DashboardApiService extends BaseApiService {
  async getStats(): Promise<IDashboardStats> {
    return this.get<IDashboardStats>("/dashboard/stats");
  }

  /** All the user's collections when collectionId is null */
  async getBreakdown(collectionId: number | null): Promise<CollectionBreakdown> {
    const query = collectionId === null ? "" : `?collection_id=${collectionId}`;
    return this.get<CollectionBreakdown>(`/dashboard/breakdown${query}`);
  }
}

export const dashboardApiService = new DashboardApiService();
