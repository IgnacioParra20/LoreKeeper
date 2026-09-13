import type { ApiErrorResponse, ApiSuccess, Universe } from "@lorekeeper/shared";
import type { CreateUniverseInput } from "@lorekeeper/validation";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {
  public constructor(
    message: string,
    public readonly code: string,
    public readonly correlationId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new ApiError(
      payload?.error.message ?? "No pudimos completar la solicitud",
      payload?.error.code ?? "REQUEST_FAILED",
      payload?.error.correlationId,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const getUniverses = async (signal?: AbortSignal): Promise<Universe[]> => {
  const response = await request<ApiSuccess<Universe[]>>(
    "/api/universes",
    signal ? { signal } : undefined,
  );
  return response.data;
};

export const createUniverse = async (input: CreateUniverseInput): Promise<Universe> => {
  const response = await request<ApiSuccess<Universe>>("/api/universes", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.data;
};
