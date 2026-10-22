import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.ts";

describe("loadConfig", () => {
  it("applies defaults when only the API key is set", () => {
    const config = loadConfig({ TMDB_API_KEY: "abc" });
    expect(config).toEqual({
      TMDB_API_KEY: "abc",
      PORT: 8080,
      DATA_DIR: "./data",
      REGION: "US",
      LANGUAGE: "en-US",
    });
  });

  it("reads overrides and coerces the port to a number", () => {
    const config = loadConfig({ TMDB_API_KEY: "abc", PORT: "3000", REGION: "gb", DATA_DIR: "/data" });
    expect(config.PORT).toBe(3000);
    expect(config.REGION).toBe("GB");
    expect(config.DATA_DIR).toBe("/data");
  });

  it("throws a helpful message when the API key is missing", () => {
    expect(() => loadConfig({})).toThrow(/TMDB_API_KEY/);
    expect(() => loadConfig({})).toThrow(/\.env\.example/);
  });

  it("rejects an invalid port and region", () => {
    expect(() => loadConfig({ TMDB_API_KEY: "abc", PORT: "nope" })).toThrow(/PORT/);
    expect(() => loadConfig({ TMDB_API_KEY: "abc", REGION: "USA" })).toThrow(/REGION/);
  });
});
