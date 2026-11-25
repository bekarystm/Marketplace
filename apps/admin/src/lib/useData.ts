'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

interface State<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/** Minimal data hook: runs the loader on mount / when deps change, exposes reload. */
export function useData<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });
  const key = JSON.stringify(deps);

  useEffect(() => {
    let cancelled = false;
    loaderRef.current().then(
      (data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      },
      (e) => {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
          setState((s) => ({ ...s, error: message, loading: false }));
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, tick]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    setTick((t) => t + 1);
  }, []);
  const setData = useCallback((data: T | null) => setState((s) => ({ ...s, data })), []);

  return { ...state, reload, setData };
}

export function unwrap<R extends { data: unknown; error: unknown }>(res: R): Exclude<R['data'], null> {
  if (res.error) throw res.error;
  return res.data as Exclude<R['data'], null>;
}
