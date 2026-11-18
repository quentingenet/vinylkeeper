import { BaseApiService } from "./BaseApiService";
import type { CollectionReportReason } from "./CollectionApiService";

interface ModerationStatus {
  id: number;
  name: string;
}

export interface ModerationRequest {
  id: number;
  place_id: number;
  status_id: number;
  created_at: string;
  submitted_at: string;
  place?: {
    id: number;
    name: string;
    city: string;
    country: string;
    description?: string;
    address?: string;
    source_url?: string | null;
    place_type_id?: number;
    place_type?: { id: number; name: string };
    is_moderated: boolean;
    is_valid: boolean;
    updated_at?: string | null;
  };
  user?: {
    username: string;
    user_uuid: string;
  };
  status?: ModerationStatus;
}

interface ModerationRequestList {
  items: ModerationRequest[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
}

interface PaginatedModerationRequestResponse {
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
export type ReportStatus = "open" | "resolved" | "dismissed";
type PlaceReportStatus = ReportStatus;

/** What every member report shows to the admin, whatever is reported */
export interface ReportBase {
  id: number;
  comment: string | null;
  status: ReportStatus;
  reporter: string | null;
  created_at: string;
  resolved_at: string | null;
}

/** A page of reports, open ones first */
export interface ReportList<Report extends ReportBase> {
  items: Report[];
  total: number;
  page: number;
  limit: number;
  open_count: number;
}

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
  updated_at?: string | null;
}

export interface PlaceReport extends ReportBase {
  place: ReportedPlace;
  issues: PlaceReportIssue[];
}

export type PlaceReportList = ReportList<PlaceReport>;

/** The reported collection, as it is now */
export interface ReportedCollection {
  id: number;
  name: string;
  description: string | null;
  is_public: boolean;
  owner: string | null;
}

export interface CollectionReport extends ReportBase {
  collection: ReportedCollection;
  reason: CollectionReportReason;
}

export type CollectionReportList = ReportList<CollectionReport>;

export interface AdminPlaceUpdate {
  name?: string;
  address?: string;
  city?: string;
  country?: string;
  description?: string | null;
  source_url?: string | null;
  place_type_id?: number;
}

/** The parts of the app that call Discogs, as counted by the API */
export type DiscogsUsageSource = "search" | "metadata" | "price" | "import" | "enrichment" | "oauth";

export interface DiscogsUsageTotals {
  calls: number;
  rate_limited: number;
  capacity: number;
}

export interface DiscogsUsage {
  current_hour: DiscogsUsageTotals;
  last_24_hours: DiscogsUsageTotals;
  by_source: {
    source: DiscogsUsageSource;
    calls_current_hour: number;
    calls_last_24_hours: number;
    rate_limited_last_24_hours: number;
  }[];
  // The last 24 hours, oldest first, the current one last
  hours: { hour: string; calls: number; rate_limited: number }[];
  lowest_remaining: number | null;
  delay_seconds: number;
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

  /** Calls made to the Discogs API in the current hour and the last 24 hours */
  async getDiscogsUsage(): Promise<DiscogsUsage> {
    return this.get<DiscogsUsage>("/vk-admin/discogs-usage");
  }

  /** Reports of abuse in public collections, open ones first */
  async getCollectionReports(status: ReportStatus | "all", page = 1, limit = 20): Promise<CollectionReportList> {
    return this.get<CollectionReportList>(`/vk-admin/collection-reports?status=${status}&page=${page}&limit=${limit}`);
  }

  /** The collection was dealt with: every open report of it is resolved */
  async resolveCollectionReport(reportId: number): Promise<CollectionReport> {
    return this.post<CollectionReport>(`/vk-admin/collection-reports/${reportId}/resolve`);
  }

  /** Nothing was wrong: only this report is closed */
  async dismissCollectionReport(reportId: number): Promise<CollectionReport> {
    return this.post<CollectionReport>(`/vk-admin/collection-reports/${reportId}/dismiss`);
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
