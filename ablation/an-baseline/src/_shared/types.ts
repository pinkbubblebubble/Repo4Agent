// Shared types across all modules

export interface ApiError {
  error: string;
  code?: string;
}

export interface ApiSuccess<T> {
  data?: T;
  message?: string;
}

export type ApiResponse<T> = T | ApiError;
