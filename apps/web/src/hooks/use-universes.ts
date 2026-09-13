import { useCallback, useEffect, useState } from "react";

import type { Universe } from "@lorekeeper/shared";
import type { CreateUniverseInput } from "@lorekeeper/validation";

import { ApiError, createUniverse, getUniverses } from "../api/client";

const messageFromError = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.correlationId
      ? `${error.message} (referencia ${error.correlationId})`
      : error.message;
  }
  return "No pudimos comunicarnos con LoreKeeper. Inténtalo nuevamente.";
};

export const useUniverses = () => {
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      setUniverses(await getUniverses(signal));
    } catch (loadError) {
      if (!(loadError instanceof DOMException && loadError.name === "AbortError")) {
        setError(messageFromError(loadError));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const create = async (input: CreateUniverseInput): Promise<Universe | null> => {
    setIsCreating(true);
    setError(null);
    try {
      const universe = await createUniverse(input);
      setUniverses((current) => [universe, ...current]);
      return universe;
    } catch (createError) {
      setError(messageFromError(createError));
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return { universes, isLoading, isCreating, error, create, reload: load };
};

