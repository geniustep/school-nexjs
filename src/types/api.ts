// Global API envelope + error model — mirrors API_REPORT.md §1, §9.
// Every endpoint returns one of these two shapes.

export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ApiMeta {
  pagination?: Pagination;
  [key: string]: unknown;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: ApiMeta;
}

// Standard error codes — API_REPORT.md §9.
export type ApiErrorCode =
  | 'unauthenticated'
  | 'permission_denied'
  | 'not_found'
  | 'validation_error'
  | 'conflict'
  | 'invalid_credentials'
  | 'inactive_user'
  | 'unsupported_role'
  | 'server_error'
  // Client-side-only synthetic code for transport/network failures.
  | 'network_error';

export interface ApiErrorBody {
  code: ApiErrorCode | string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  error: ApiErrorBody;
  meta: ApiMeta;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Common embedded reference shapes used across many resources.
export interface Ref {
  id: number;
  name: string;
}

export interface SchoolRef {
  id: number;
  name: string;
}

// Query params accepted by paginated list endpoints.
export interface ListParams {
  page?: number;
  page_size?: number;
  [key: string]: string | number | undefined;
}
