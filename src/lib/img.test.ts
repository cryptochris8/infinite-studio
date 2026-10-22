import { describe, expect, it } from "vitest";
import { imageUrl, posterSrcSet, youtubeEmbedUrl } from "./img.ts";

describe("imageUrl", () => {
  it("builds a TMDB URL for the size", () => {
    expect(imageUrl("/abc.jpg", "w342")).toBe("https://image.tmdb.org/t/p/w342/abc.jpg");
  });

  it("returns null for a missing path", () => {
    expect(imageUrl(null, "w342")).toBeNull();
    expect(imageUrl(undefined, "w342")).toBeNull();
    expect(imageUrl("", "w342")).toBeNull();
  });
});

describe("posterSrcSet", () => {
  it("lists every poster size with width descriptors", () => {
    expect(posterSrcSet("/p.jpg")).toBe(
      "https://image.tmdb.org/t/p/w185/p.jpg 185w, https://image.tmdb.org/t/p/w342/p.jpg 342w, https://image.tmdb.org/t/p/w500/p.jpg 500w",
    );
  });

  it("is undefined without a poster", () => {
    expect(posterSrcSet(null)).toBeUndefined();
  });
});

describe("youtubeEmbedUrl", () => {
  it("uses the privacy-friendly domain and only autoplays on request", () => {
    const quiet = new URL(youtubeEmbedUrl("abc123"));
    expect(quiet.hostname).toBe("www.youtube-nocookie.com");
    expect(quiet.pathname).toBe("/embed/abc123");
    expect(quiet.searchParams.has("autoplay")).toBe(false);
    expect(new URL(youtubeEmbedUrl("abc123", true)).searchParams.get("autoplay")).toBe("1");
  });

  it("encodes the video id so it cannot change the URL", () => {
    expect(youtubeEmbedUrl("a/../b?x=1")).not.toContain("?x=1");
  });
});
