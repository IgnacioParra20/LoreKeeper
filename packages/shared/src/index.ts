export const UNIVERSE_STATUSES = ["ACTIVE", "ARCHIVED"] as const;

export type UniverseStatus = (typeof UNIVERSE_STATUSES)[number];

export interface PublicUser {
  id: string;
  email: string;
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
  updatedAt: string;
}

export interface AuthResult {
  user: PublicUser;
  csrfToken: string;
}

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
