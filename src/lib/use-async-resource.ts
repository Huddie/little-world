import { useCallback, useEffect, useState } from "react";
import type React from "react";

export type AsyncResource<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: null; error: Error };

export function useAsyncResource<T>(load: () => Promise<T>, dependencies: React.DependencyList = []) {
  const [resource, setResource] = useState<AsyncResource<T>>({ status: "loading", data: null, error: null });

  const reload = useCallback(() => {
    setResource({ status: "loading", data: null, error: null });
    void load()
      .then((data) => setResource({ status: "success", data, error: null }))
      .catch((error: unknown) => setResource({ status: "error", data: null, error: toError(error) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...resource, reload };
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error("Unexpected error");
}
