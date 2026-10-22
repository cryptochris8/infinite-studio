import { describe, expect, it, vi } from "vitest";
import { TtlCache } from "./cache.ts";

describe("TtlCache", () => {
  it("returns the cached value until the TTL passes, then reloads", async () => {
    let now = 1000;
    const cache = new TtlCache(10, () => now);
    const load = vi.fn().mockResolvedValueOnce("first").mockResolvedValueOnce("second");

    expect(await cache.get("k", 100, load)).toBe("first");
    now = 1099;
    expect(await cache.get("k", 100, load)).toBe("first");
    now = 1100;
    expect(await cache.get("k", 100, load)).toBe("second");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight load between concurrent callers", async () => {
    const cache = new TtlCache();
    let resolve!: (v: string) => void;
    const load = vi.fn(() => new Promise<string>((r) => (resolve = r)));

    const a = cache.get("k", 1000, load);
    const b = cache.get("k", 1000, load);
    resolve("value");

    expect(await a).toBe("value");
    expect(await b).toBe("value");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures, so the next call retries", async () => {
    const cache = new TtlCache();
    const load = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("ok");

    await expect(cache.get("k", 1000, load)).rejects.toThrow("boom");
    expect(await cache.get("k", 1000, load)).toBe("ok");
  });

  it("evicts the oldest entry when over capacity", async () => {
    const cache = new TtlCache(2);
    await cache.get("a", 1000, async () => 1);
    await cache.get("b", 1000, async () => 2);
    await cache.get("c", 1000, async () => 3);

    expect(cache.size).toBe(2);
    const reloadA = vi.fn().mockResolvedValue(10);
    expect(await cache.get("a", 1000, reloadA)).toBe(10);
    expect(reloadA).toHaveBeenCalledTimes(1);
  });
});
