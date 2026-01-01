import { BaseApiService } from "./BaseApiService";
import { IDashboardStats } from "@models/IDashboardStats";

export class DashboardApiService extends BaseApiService {
  async getStats(): Promise<IDashboardStats> {
    return this.get<IDashboardStats>("/dashboard/stats");
  }
}

export const dashboardApiService = new DashboardApiService();
