export interface PaginationMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiSuccessResponse<T> {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiPaginatedResponse<T> {
  ok: true;
  data: T[];
  pagination: PaginationMeta;
}

export interface ApiErrorResponse {
  ok: false;
  error: ApiErrorDetail;
}

export function parsePagination(
  query: Record<string, unknown> | URLSearchParams = {},
): {
  page: number;
  pageSize: number;
  offset: number;
} {
  const getParam = (key: string): unknown =>
    query instanceof URLSearchParams ? query.get(key) : query[key];

  const rawPage = Number(getParam("page") ?? 1);
  const rawPageSize = Number(getParam("page_size") ?? getParam("pageSize") ?? 20);

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize >= 1
      ? Math.min(Math.floor(rawPageSize), 100)
      : 20;

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  };
}

export function apiSuccess<T>(
  data: T,
  meta?: Record<string, unknown>,
): ApiSuccessResponse<T> {
  return {
    ok: true,
    data,
    ...(meta ? { meta } : {}),
  };
}

export function apiPaginated<T>(
  items: T[],
  pagination: { page: number; pageSize: number; totalItems: number },
): ApiPaginatedResponse<T> {
  const totalPages = Math.max(
    1,
    Math.ceil(pagination.totalItems / pagination.pageSize),
  );
  return {
    ok: true,
    data: items,
    pagination: {
      page: pagination.page,
      page_size: pagination.pageSize,
      total_items: pagination.totalItems,
      total_pages: totalPages,
    },
  };
}

export function apiError(
  code: string,
  message: string,
  details?: unknown,
): ApiErrorResponse {
  return {
    ok: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
}