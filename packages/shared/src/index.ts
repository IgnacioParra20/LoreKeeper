export const UNIVERSE_STATUSES = ["ACTIVE", "ARCHIVED"] as const;

export type UniverseStatus = (typeof UNIVERSE_STATUSES)[number];

export interface Universe {
  id: string;
  name: string;
  description: string | null;
  status: UniverseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    correlationId: string;
    details?: ApiFieldError[];
  };
}

