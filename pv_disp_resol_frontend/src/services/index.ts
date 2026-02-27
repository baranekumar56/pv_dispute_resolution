// ─── Base API error shape (normalized from interceptor) ──────────────────────
export interface NormalizedError {
  code: string;
  message: string;
  status_code: number;
}

// ─── Generic paginated list ───────────────────────────────────────────────────
export interface PaginationParams {
  page?: number;
  limit?: number;
}
