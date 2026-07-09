/** Canonical pagination contract for all list endpoints. */
export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<TItem, TKey extends string = "items"> = PaginationMeta & {
  [K in TKey]: TItem[];
};

export type SortDirection = "asc" | "desc";

export type ListQueryParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  sortBy?: string;
  sortDir?: SortDirection;
};
