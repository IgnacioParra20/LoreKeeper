import { useCallback, useEffect, useRef, useState } from "react";

import type { Universe } from "@lorekeeper/shared";
import type { CreateUniverseInput } from "@lorekeeper/validation";

import { ApiError, createUniverse, getUniverses, isAborted } from "../api/client";

const messageFromError = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.correlationId
      ? `${error.message} (referencia ${error.correlationId})`
      : error.message;
  }
  return "No pudimos comunicarnos con LoreKeeper. Inténtalo nuevamente.";
};

export const useUniverses = () => {
  const lifecycle = useRef<AbortController | null>(null);
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const values = await getUniverses(signal);
      if (!signal?.aborted) setUniverses(values);
    } catch (loadError) {
      if (!isAborted(loadError)) {
        setError(messageFromError(loadError));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    lifecycle.current = controller;
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const create = async (input: CreateUniverseInput): Promise<Universe | null> => {
    setIsCreating(true);
    setError(null);
    try {
      const universe = await createUniverse(input, lifecycle.current?.signal);
      if (lifecycle.current?.signal.aborted) return null;
      setUniverses((current) => [universe, ...current]);
      return universe;
    } catch (createError) {
      if (!isAborted(createError)) setError(messageFromError(createError));
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return { universes, isLoading, isCreating, error, create, reload: load };
};
