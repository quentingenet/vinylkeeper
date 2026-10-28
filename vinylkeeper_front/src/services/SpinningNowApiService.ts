import { BaseApiService } from "./BaseApiService";
import type {
  SpinningNowFilters,
  SpinningNowOptions,
  SpinningNowResult,
} from "@models/ISpinningNow";

export const SPINNING_NOW_PAGE_SIZE = 12;

/** Repeated keys (moods=a&moods=b), the format FastAPI reads as lists. */
export function buildSpinningNowQuery(filters: SpinningNowFilters, limit: number): string {
  const params = new URLSearchParams();
  filters.moods.forEach((mood) => params.append("moods", mood));
  filters.eras.forEach((era) => params.append("eras", String(era)));
  filters.genres.forEach((genre) => params.append("genres", genre));
  filters.collections.forEach((id) => params.append("collections", String(id)));
  params.append("limit", String(limit));
  return params.toString();
}

export class SpinningNowApiService extends BaseApiService {
  async getOptions(): Promise<SpinningNowOptions> {
    return this.get<SpinningNowOptions>("/spinning-now/options");
  }

  async pick(filters: SpinningNowFilters, limit: number = SPINNING_NOW_PAGE_SIZE): Promise<SpinningNowResult> {
    return this.get<SpinningNowResult>(`/spinning-now/?${buildSpinningNowQuery(filters, limit)}`);
  }
}

export const spinningNowApiService = new SpinningNowApiService();
