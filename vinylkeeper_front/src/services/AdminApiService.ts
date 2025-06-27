import { BaseApiService } from "./BaseApiService";

export interface ModerationStatus {
  id: number;
  name: string;
}

export interface ModerationRequest {
  id: number;
  place_id: number;
  user_id: number;
  status_id: number;
  created_at: string;
  submitted_at: string;
  place?: {
    id: number;
    name: string;
    city: string;
    country: string;
    description?: string;
    is_moderated: boolean;
    is_valid: boolean;
  };
  user?: {
    id: number;
    username: string;
  };
  status?: ModerationStatus;
}

export interface ModerationRequestList {
  items: ModerationRequest[];
  total: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
}

export interface ModerationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

class AdminApiService extends BaseApiService {
  async getModerationRequests(
    limit?: number,
    offset?: number
  ): Promise<ModerationRequestList> {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());

    const query = params.toString() ? `?${params.toString()}` : "";
    return this.get<ModerationRequestList>(
      `/vk-admin/moderation-requests${query}`
    );
  }

  async getPendingModerationRequests(
    limit?: number,
    offset?: number
  ): Promise<ModerationRequest[]> {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());

    const query = params.toString() ? `?${params.toString()}` : "";
    return this.get<ModerationRequest[]>(
      `/vk-admin/moderation-requests/pending${query}`
    );
  }

  async getModerationRequestById(
    requestId: number
  ): Promise<ModerationRequest> {
    return this.get<ModerationRequest>(
      `/vk-admin/moderation-requests/${requestId}`
    );
  }

  async approveModerationRequest(
    requestId: number
  ): Promise<ModerationRequest> {
    return this.post<ModerationRequest>(
      `/vk-admin/moderation-requests/${requestId}/approve`
    );
  }

  async rejectModerationRequest(requestId: number): Promise<ModerationRequest> {
    return this.post<ModerationRequest>(
      `/vk-admin/moderation-requests/${requestId}/reject`
    );
  }

  async getModerationStats(): Promise<ModerationStats> {
    return this.get<ModerationStats>("/vk-admin/moderation-stats");
  }
}

export const adminApiService = new AdminApiService();
