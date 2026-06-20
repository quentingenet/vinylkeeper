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
    place_type?: { id: number; name: string };
    is_moderated: boolean;
    is_valid: boolean;
  };
  user?: {
    username: string;
    user_uuid: string;
  };
  status?: ModerationStatus;
}

export interface ModerationRequestList {
  items: ModerationRequest[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
}

export interface PaginatedModerationRequestResponse {
  items: ModerationRequest[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ModerationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

class AdminApiService extends BaseApiService {
  async getModerationRequests(
    page = 1,
    limit = 10
  ): Promise<ModerationRequestList> {
    return this.get<ModerationRequestList>(
      `/vk-admin/moderation-requests?page=${page}&limit=${limit}`
    );
  }

  async getPendingModerationRequests(
    page = 1,
    limit = 10
  ): Promise<PaginatedModerationRequestResponse> {
    return this.get<PaginatedModerationRequestResponse>(
      `/vk-admin/moderation-requests/pending?page=${page}&limit=${limit}`
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
