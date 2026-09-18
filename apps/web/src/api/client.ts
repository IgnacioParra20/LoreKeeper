import type { ApiErrorResponse, ApiSuccess, AuthResult, Character, PublicUser, Universe } from "@lorekeeper/shared";
import type { CreateCharacterInput, CreateUniverseInput, Credentials, UpdateCharacterInput, UpdateUniverseInput } from "@lorekeeper/validation";

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

let csrfToken: string | null = null;
let epoch = 0;
const active = new Set<AbortController>();
export const resetSession = () => {
  epoch++;
  csrfToken = null;
  for (const controller of active) controller.abort();
  active.clear();
};
const aborted = () => new DOMException("La sesión cambió", "AbortError");
export const isAborted = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

const request = async <T>(path: string, init: RequestInit = {}, retry = true): Promise<T> => {
  const startedAt = epoch;
  const controller = new AbortController();
  const abort = () => controller.abort();
  init.signal?.addEventListener("abort", abort, { once: true });
  if (init.signal?.aborted) controller.abort();
  active.add(controller);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init, credentials: "include", signal: controller.signal,
      headers: { ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}), ...init.headers },
    });
    if (startedAt !== epoch || controller.signal.aborted) throw aborted();
    const payload = response.status === 204 ? undefined : await response.json().catch(() => null) as T & ApiErrorResponse;
    if (startedAt !== epoch || controller.signal.aborted) throw aborted();
    if (!response.ok) {
      const error = payload as ApiErrorResponse | undefined;
      if (response.status === 403 && error?.error?.code === "CSRF_INVALID" && retry && path !== "/api/auth/csrf") {
        await refreshCsrf();
        if (startedAt !== epoch) throw aborted();
        return request<T>(path, init, false);
      }
      if (response.status === 401 && !["/api/auth/login", "/api/auth/register", "/api/auth/me"].includes(path)) {
        resetSession();
        window.dispatchEvent(new Event("lorekeeper:session-expired"));
      }
      throw new ApiError(error?.error?.message ?? "No pudimos completar la solicitud", error?.error?.code ?? "REQUEST_FAILED", error?.error?.correlationId);
    }
    return payload as T;
  } finally {
    active.delete(controller);
    init.signal?.removeEventListener("abort", abort);
  }
};
export const refreshCsrf = async () => {
  const result = await request<ApiSuccess<{ csrfToken: string }>>("/api/auth/csrf", {}, false);
  csrfToken = result.data.csrfToken;
};
export const getCurrentUser = async (signal?: AbortSignal) => {
  const result = await request<ApiSuccess<PublicUser>>("/api/auth/me", signal ? { signal } : {});
  return result.data;
};
export const authenticate = async (mode: "login" | "register", input: Credentials) => {
  resetSession();
  const result = await request<ApiSuccess<AuthResult>>(`/api/auth/${mode}`, { method: "POST", body: JSON.stringify(input) });
  csrfToken = result.data.csrfToken;
  return result.data.user;
};
export const logout = async () => { await request<void>("/api/auth/logout", { method: "POST" }); resetSession(); };

export const getUniverses = async (signal?: AbortSignal): Promise<Universe[]> => {
  const response = await request<ApiSuccess<Universe[]>>(
    "/api/universes",
    signal ? { signal } : undefined,
  );
  return response.data;
};

export const createUniverse = async (input: CreateUniverseInput, signal?: AbortSignal): Promise<Universe> => {
  const response = await request<ApiSuccess<Universe>>("/api/universes", {
    method: "POST",
    body: JSON.stringify(input),
    ...(signal ? { signal } : {}),
  });
  return response.data;
};
export const getUniverse = async (id: string, signal?: AbortSignal) => {
  const result = await request<ApiSuccess<Universe>>(`/api/universes/${id}`, signal ? { signal } : {});
  return result.data;
};
export const updateUniverse = async (id: string, input: UpdateUniverseInput, signal?: AbortSignal) => {
  const result = await request<ApiSuccess<Universe>>(`/api/universes/${id}`, { method: "PATCH", body: JSON.stringify(input), ...(signal ? { signal } : {}) });
  return result.data;
};
const charactersPath = (universeId: string) => `/api/universes/${universeId}/characters`;
export const getCharacters = async (universeId: string, signal?: AbortSignal) => {
  const result = await request<ApiSuccess<Character[]>>(charactersPath(universeId), signal ? { signal } : {});
  return result.data;
};
export const createCharacter = async (universeId: string, input: CreateCharacterInput, signal?: AbortSignal) => {
  const result = await request<ApiSuccess<Character>>(charactersPath(universeId), { method: "POST", body: JSON.stringify(input), ...(signal ? { signal } : {}) });
  return result.data;
};
export const updateCharacter = async (universeId: string, characterId: string, input: UpdateCharacterInput, signal?: AbortSignal) => {
  const result = await request<ApiSuccess<Character>>(`${charactersPath(universeId)}/${characterId}`, { method: "PATCH", body: JSON.stringify(input), ...(signal ? { signal } : {}) });
  return result.data;
};
export const deleteCharacter = async (universeId: string, characterId: string, signal?: AbortSignal) => {
  await request<void>(`${charactersPath(universeId)}/${characterId}`, { method: "DELETE", ...(signal ? { signal } : {}) });
};
