// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAsync } from "./useAsync.ts";

describe("useAsync", () => {
  it("starts loading, then provides the data", async () => {
    const { result } = renderHook(() => useAsync(async () => "hello", []));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe("hello");
    expect(result.current.error).toBeUndefined();
  });

  it("exposes errors", async () => {
    const { result } = renderHook(() =>
      useAsync(async () => {
        throw new Error("nope");
      }, []),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe("nope");
    expect(result.current.data).toBeUndefined();
  });

  it("reloads when deps change, keeping the old data meanwhile", async () => {
    let resolveSecond!: (v: string) => void;
    const load = vi
      .fn<(s: AbortSignal) => Promise<string>>()
      .mockResolvedValueOnce("one")
      .mockImplementationOnce(() => new Promise((r) => (resolveSecond = r)));

    const { result, rerender } = renderHook(({ id }) => useAsync(load, [id]), { initialProps: { id: 1 } });
    await waitFor(() => expect(result.current.data).toBe("one"));

    rerender({ id: 2 });
    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(result.current.data).toBe("one");

    await act(async () => resolveSecond("two"));
    expect(result.current.data).toBe("two");
    expect(result.current.loading).toBe(false);
  });

  it("ignores a stale response that arrives after a newer request", async () => {
    const resolvers: Array<(v: string) => void> = [];
    const load = vi.fn(() => new Promise<string>((r) => resolvers.push(r)));

    const { result, rerender } = renderHook(({ id }) => useAsync(load, [id]), { initialProps: { id: 1 } });
    rerender({ id: 2 });
    await waitFor(() => expect(resolvers).toHaveLength(2));

    await act(async () => resolvers[1]!("new"));
    await act(async () => resolvers[0]!("stale"));
    expect(result.current.data).toBe("new");
  });

  it("aborts the in-flight request on unmount", async () => {
    let seen!: AbortSignal;
    const { unmount } = renderHook(() =>
      useAsync((signal) => {
        seen = signal;
        return new Promise<string>(() => {});
      }, []),
    );
    expect(seen.aborted).toBe(false);
    unmount();
    expect(seen.aborted).toBe(true);
  });

  it("runs again when reload() is called", async () => {
    const load = vi.fn().mockResolvedValueOnce("a").mockResolvedValueOnce("b");
    const { result } = renderHook(() => useAsync(load, []));
    await waitFor(() => expect(result.current.data).toBe("a"));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.data).toBe("b"));
  });
});
