import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./api.ts";

function mockFetch(response: Response | Error) {
  const fn = vi.fn(async (_url: string, _init?: RequestInit) => {
    if (response instanceof Error) throw response;
    // A Response body can only be read once, so hand out a fresh copy per call.
    return response.clone();
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("api", () => {
  it("fetches JSON from the /api prefix", async () => {
    const fetchFn = mockFetch(json({ hero: [], rows: [] }));
    expect(await api.home()).toEqual({ hero: [], rows: [] });
    expect(fetchFn.mock.calls[0]![0]).toBe("/api/home");
  });

  it("builds query strings and skips empty values", async () => {
    const fetchFn = mockFetch(json({ page: 1, totalPages: 1, items: [] }));
    await api.browse("tv", { genre: 18, sort: "vote_average.desc", page: undefined });
    expect(fetchFn.mock.calls[0]![0]).toBe("/api/browse/tv?genre=18&sort=vote_average.desc");

    await api.search("star wars", 2);
    expect(fetchFn.mock.calls[1]![0]).toBe("/api/search?q=star+wars&page=2");
  });

  it("sends a JSON body when creating a profile", async () => {
    const fetchFn = mockFetch(json({ id: 2, name: "Dad" }, 201));
    expect(await api.createProfile("Dad")).toEqual({ id: 2, name: "Dad" });
    const init = fetchFn.mock.calls[0]![1]!;
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"name":"Dad"}');
    expect((init.headers as Record<string, string>)["content-type"]).toBe("application/json");
  });

  it("returns undefined for 204 responses", async () => {
    mockFetch(new Response(null, { status: 204 }));
    expect(await api.removeFromWatchlist(1, "movie", 5)).toBeUndefined();
  });

  it("throws an ApiError carrying the server's message and status", async () => {
    mockFetch(json({ error: "Not found" }, 404));
    await expect(api.title("movie", 1)).rejects.toMatchObject({ name: "ApiError", message: "Not found", status: 404 });
  });

  it("falls back to a generic message when the error body isn't JSON", async () => {
    mockFetch(new Response("<html>bad gateway</html>", { status: 502 }));
    await expect(api.home()).rejects.toMatchObject({ message: "Request failed (502)", status: 502 });
  });

  it("explains a network failure in plain language", async () => {
    mockFetch(new TypeError("Failed to fetch"));
    const error = await api.home().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toMatch(/Can't reach/);
    expect((error as ApiError).status).toBe(0);
  });

  it("lets aborts through untouched so callers can ignore them", async () => {
    mockFetch(new DOMException("aborted", "AbortError"));
    await expect(api.home()).rejects.toMatchObject({ name: "AbortError" });
  });
});
