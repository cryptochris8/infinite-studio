import { useCallback, useEffect, useRef, useState } from "react";
import type { Page, Title } from "@shared/types.ts";

export interface PagedState {
  items: Title[];
  /** True while the first page is loading. */
  loading: boolean;
  loadingMore: boolean;
  error: Error | undefined;
  hasMore: boolean;
  loadMore: () => void;
  reload: () => void;
}

const keyOf = (t: Title) => `${t.mediaType}:${t.id}`;

/** Loads page 1 whenever `deps` change, then appends further pages on demand without duplicates. */
export function usePaged(
  load: (page: number, signal: AbortSignal) => Promise<Page<Title>>,
  deps: readonly unknown[],
): PagedState {
  const [state, setState] = useState({
    items: [] as Title[],
    page: 0,
    totalPages: 0,
    loading: true,
    loadingMore: false,
    error: undefined as Error | undefined,
  });
  const [nonce, setNonce] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;
  const controller = useRef<AbortController | null>(null);
  const latest = useRef(state);
  latest.current = state;
  const fetchingMore = useRef(false);

  useEffect(() => {
    const ctl = new AbortController();
    controller.current = ctl;
    fetchingMore.current = false;
    setState({ items: [], page: 0, totalPages: 0, loading: true, loadingMore: false, error: undefined });
    loadRef
      .current(1, ctl.signal)
      .then((res) => {
        if (ctl.signal.aborted) return;
        setState({ items: res.items, page: res.page, totalPages: res.totalPages, loading: false, loadingMore: false, error: undefined });
      })
      .catch((error: unknown) => {
        if (ctl.signal.aborted) return;
        setState((s) => ({ ...s, loading: false, error: error instanceof Error ? error : new Error(String(error)) }));
      });
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const loadMore = useCallback(() => {
    const ctl = controller.current;
    const current = latest.current;
    if (!ctl || ctl.signal.aborted || fetchingMore.current) return;
    if (current.loading || current.page >= current.totalPages) return;

    fetchingMore.current = true;
    setState((s) => ({ ...s, loadingMore: true, error: undefined }));
    loadRef
      .current(current.page + 1, ctl.signal)
      .then((res) => {
        if (ctl.signal.aborted) return;
        setState((s) => {
          const seen = new Set(s.items.map(keyOf));
          return {
            ...s,
            items: [...s.items, ...res.items.filter((t) => !seen.has(keyOf(t)))],
            page: res.page,
            totalPages: res.totalPages,
            loadingMore: false,
          };
        });
      })
      .catch((error: unknown) => {
        if (ctl.signal.aborted) return;
        setState((s) => ({ ...s, loadingMore: false, error: error instanceof Error ? error : new Error(String(error)) }));
      })
      .finally(() => {
        // Only release the guard for the request set that started it; a reset does that itself.
        if (controller.current === ctl) fetchingMore.current = false;
      });
  }, []);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return {
    items: state.items,
    loading: state.loading,
    loadingMore: state.loadingMore,
    error: state.error,
    hasMore: state.page < state.totalPages,
    loadMore,
    reload,
  };
}
