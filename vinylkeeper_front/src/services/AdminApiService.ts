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

export type PlaceReportIssue = "name" | "description" | "address" | "website" | "type" | "closed";
export type PlaceReportStatus = "open" | "resolved" | "dismissed";

/** Every field of a spot an admin can correct, as it is now */
export interface ReportedPlace {
  id: number;
  name: string;
  address: string;
  city: string;
  country: string;
  description: string | null;
  source_url: string | null;
  place_type_id: number;
  place_type: string | null;
  is_valid: boolean;
  is_moderated: boolean;
}

export interface PlaceReport {
  id: number;
  place: ReportedPlace;
  issues: PlaceReportIssue[];
  comment: string | null;
  status: PlaceReportStatus;
  reporter: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface PlaceReportList {
  items: PlaceReport[];
  total: number;
  page: number;
  limit: number;
  open_count: number;
}

export interface AdminPlaceUpdate {
  name?: string;
  address?: string;
  city?: string;
  country?: string;
  description?: string | null;
  source_url?: string | null;
  place_type_id?: number;
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

  /** Reports of wrong information on Atlas spots, open ones first */
  async getPlaceReports(status: PlaceReportStatus | "all", page = 1, limit = 20): Promise<PlaceReportList> {
    return this.get<PlaceReportList>(`/vk-admin/place-reports?status=${status}&page=${page}&limit=${limit}`);
  }

  /** The spot was fixed: every open report of it is resolved */
  async resolvePlaceReport(reportId: number): Promise<PlaceReport> {
    return this.post<PlaceReport>(`/vk-admin/place-reports/${reportId}/resolve`);
  }

  /** Nothing was wrong: only this report is closed */
  async dismissPlaceReport(reportId: number): Promise<PlaceReport> {
    return this.post<PlaceReport>(`/vk-admin/place-reports/${reportId}/dismiss`);
  }

  /** Published at once, without moderation */
  async updatePlace(placeId: number, data: AdminPlaceUpdate): Promise<ReportedPlace> {
    return this.patch<ReportedPlace>(`/vk-admin/places/${placeId}`, data);
  }

  /** A permanently closed spot leaves the map; its open reports are resolved */
  async removePlace(placeId: number): Promise<void> {
    return this.delete<void>(`/vk-admin/places/${placeId}`);
  }
}

export const adminApiService = new AdminApiService();
