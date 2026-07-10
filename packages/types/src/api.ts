export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorPayload {
  success: false;
  error: {
    message: string;
    code?: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorPayload;

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
