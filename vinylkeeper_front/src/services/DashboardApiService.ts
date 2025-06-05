import { BaseApiService } from "./BaseApiService";
import { IDashboardStats } from "@models/IDashboardStats";

export class DashboardApiService extends BaseApiService {
  async getStats(
    year: number = new Date().getFullYear()
  ): Promise<IDashboardStats> {
    return this.get<IDashboardStats>(`/dashboard/stats?year=${year}`);
  }
}

export const dashboardApiService = new DashboardApiService();
