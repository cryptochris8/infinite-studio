// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Page, Title } from "@shared/types.ts";
import { usePaged } from "./usePaged.ts";

const t = (id: number, mediaType: Title["mediaType"] = "movie"): Title => ({
  id,
  mediaType,
  title: `T${id}`,
  overview: "",
  posterPath: null,
  backdropPath: null,
  year: 2000,
  rating: 7,
  voteCount: 10,
  genreIds: [],
});
const page = (n: number, totalPages: number, ids: number[]): Page<Title> => ({ page: n, totalPages, items: ids.map((i) => t(i)) });

describe("usePaged", () => {
  it("loads the first page", async () => {
    const load = vi.fn().mockResolvedValue(page(1, 3, [1, 2]));
    const { result } = renderHook(() => usePaged(load, []));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items.map((i) => i.id)).toEqual([1, 2]);
    expect(result.current.hasMore).toBe(true);
    expect(load).toHaveBeenCalledWith(1, expect.any(AbortSignal));
  });

  it("appends the next page and drops duplicates", async () => {
    const load = vi.fn().mockResolvedValueOnce(page(1, 2, [1, 2])).mockResolvedValueOnce(page(2, 2, [2, 3]));
    const { result } = renderHook(() => usePaged(load, []));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(3));
    expect(result.current.items.map((i) => i.id)).toEqual([1, 2, 3]);
    expect(result.current.hasMore).toBe(false);
    expect(load).toHaveBeenLastCalledWith(2, expect.any(AbortSignal));
  });

  it("does nothing on loadMore when there are no more pages", async () => {
    const load = vi.fn().mockResolvedValue(page(1, 1, [1]));
    const { result } = renderHook(() => usePaged(load, []));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.loadMore());
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not start a second load while one is in flight", async () => {
    let resolve!: (p: Page<Title>) => void;
    const load = vi
      .fn()
      .mockResolvedValueOnce(page(1, 3, [1]))
      .mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const { result } = renderHook(() => usePaged(load, []));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.loadMore());
    act(() => result.current.loadMore());
    expect(load).toHaveBeenCalledTimes(2);
    await act(async () => resolve(page(2, 3, [2])));
    expect(result.current.items).toHaveLength(2);
  });

  it("starts over when deps change", async () => {
    const load = vi.fn(async (_p: number, _s: AbortSignal) => page(1, 1, [1]));
    const { result, rerender } = renderHook(({ genre }) => usePaged(load, [genre]), { initialProps: { genre: 1 } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    rerender({ genre: 2 });
    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("reports a first-page failure and recovers on reload", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(page(1, 1, [9]));
    const { result } = renderHook(() => usePaged(load, []));
    await waitFor(() => expect(result.current.error?.message).toBe("offline"));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.items.map((i) => i.id)).toEqual([9]));
    expect(result.current.error).toBeUndefined();
  });

  it("keeps loaded items when a later page fails", async () => {
    const load = vi.fn().mockResolvedValueOnce(page(1, 2, [1])).mockRejectedValueOnce(new Error("slow"));
    const { result } = renderHook(() => usePaged(load, []));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.error?.message).toBe("slow"));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.loadingMore).toBe(false);
  });
});
