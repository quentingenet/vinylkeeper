import { BaseApiService } from "./BaseApiService";
import {
  CollectionBreakdown,
  CollectionValue,
  IDashboardStats,
  ValueRefresh,
  ValueScope,
} from "@models/IDashboardStats";

function valueQuery(scope: ValueScope): string {
  if (scope === "largest") return "";
  return scope === "all" ? "?all=true" : `?collection_id=${scope}`;
}

export class DashboardApiService extends BaseApiService {
  async getStats(): Promise<IDashboardStats> {
    return this.get<IDashboardStats>("/dashboard/stats");
  }

  /** All the user's collections when collectionId is null */
  async getBreakdown(collectionId: number | null): Promise<CollectionBreakdown> {
    const query = collectionId === null ? "" : `?collection_id=${collectionId}`;
    return this.get<CollectionBreakdown>(`/dashboard/breakdown${query}`);
  }

  async getValue(scope: ValueScope): Promise<CollectionValue> {
    return this.get<CollectionValue>(`/dashboard/value${valueQuery(scope)}`);
  }

  /** Discogs prices of every collection asked again in the background, once a day at most */
  async refreshValue(): Promise<ValueRefresh> {
    return this.post<ValueRefresh>("/dashboard/value/refresh");
  }
}

export const dashboardApiService = new DashboardApiService();
