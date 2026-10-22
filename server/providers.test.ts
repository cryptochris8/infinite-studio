import { describe, expect, it } from "vitest";
import { providerSearchUrl } from "./providers.ts";

describe("providerSearchUrl", () => {
  it("builds a URL-encoded search link for a known service", () => {
    expect(providerSearchUrl("Tubi", "Spider-Man: Homecoming")).toBe(
      "https://tubitv.com/search/Spider-Man%3A%20Homecoming",
    );
  });

  it("matches service names case-insensitively and ignores padding", () => {
    expect(providerSearchUrl("  PLUTO TV ", "Heat")).toContain("pluto.tv");
  });

  it("returns null for a service it does not know", () => {
    expect(providerSearchUrl("Some Tiny Service", "Heat")).toBeNull();
  });
});
