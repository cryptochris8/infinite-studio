import { describe, expect, it, vi } from "vitest";
import { fetchTmdbImage, ImageError } from "./images.ts";

describe("fetchTmdbImage", () => {
  it("fetches the image from TMDB and marks it cacheable", async () => {
    const fetchFn = vi.fn(
      async () => new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/jpeg" } }),
    );
    const res = await fetchTmdbImage("w342", "abc_D-1.jpg", fetchFn as unknown as typeof fetch);
    expect(fetchFn).toHaveBeenCalledWith("https://image.tmdb.org/t/p/w342/abc_D-1.jpg");
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toContain("max-age=604800");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it.each([
    ["original", "a.jpg"],
    ["w342", "../secret.jpg"],
    ["w342", "a.jpg?x=1"],
    ["w342", "a.exe"],
    ["w342", "sub%2Fa.jpg"],
  ])("rejects size %s with file %s without fetching", async (size, file) => {
    const fetchFn = vi.fn();
    await expect(fetchTmdbImage(size, file, fetchFn)).rejects.toMatchObject({ status: 400 });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("passes a TMDB 404 through and reports other failures as 502", async () => {
    const missing = vi.fn(async () => new Response(null, { status: 404 }));
    await expect(fetchTmdbImage("w342", "a.jpg", missing as unknown as typeof fetch)).rejects.toMatchObject({
      status: 404,
    });

    const broken = vi.fn(async () => new Response("oops", { status: 500 }));
    await expect(fetchTmdbImage("w342", "a.jpg", broken as unknown as typeof fetch)).rejects.toMatchObject({
      status: 502,
    });

    const offline = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    const error = await fetchTmdbImage("w342", "a.jpg", offline as unknown as typeof fetch).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ImageError);
    expect((error as ImageError).status).toBe(502);
  });
});
