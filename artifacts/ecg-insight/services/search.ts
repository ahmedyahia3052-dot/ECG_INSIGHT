import { apiRequest } from "./api";

export type GlobalSearchResultType = "case" | "doctor" | "employee" | "organization" | "patient" | "report";

export interface GlobalSearchResult {
  id: string;
  meta?: string;
  subtitle?: string;
  title: string;
  type: GlobalSearchResultType;
  url: string;
}

export interface GlobalSearchResponse {
  query: string;
  results: GlobalSearchResult[];
  total: number;
}

export async function globalSearch(accessToken: string, query: string) {
  return apiRequest<GlobalSearchResponse>(`/search?q=${encodeURIComponent(query)}`, { accessToken });
}
