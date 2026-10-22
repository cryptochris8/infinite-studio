import { describe, expect, it } from "vitest";
import { formatRating, formatRuntime, titlePath, truncate, typeLabel, yearLabel } from "./format.ts";

describe("formatRuntime", () => {
  it.each([
    [170, "2h 50m"],
    [45, "45m"],
    [120, "2h"],
    [61, "1h 1m"],
  ])("formats %i minutes as %s", (minutes, expected) => {
    expect(formatRuntime(minutes)).toBe(expected);
  });

  it("returns an empty string when unknown or invalid", () => {
    expect(formatRuntime(null)).toBe("");
    expect(formatRuntime(0)).toBe("");
    expect(formatRuntime(-5)).toBe("");
  });
});

describe("formatRating", () => {
  it("shows one decimal place", () => {
    expect(formatRating({ rating: 7.94, voteCount: 100 })).toBe("7.9");
    expect(formatRating({ rating: 8, voteCount: 100 })).toBe("8.0");
  });

  it("hides ratings that are zero or have almost no votes", () => {
    expect(formatRating({ rating: 0, voteCount: 100 })).toBeNull();
    expect(formatRating({ rating: 9.5, voteCount: 2 })).toBeNull();
  });
});

describe("labels and paths", () => {
  it("shows TBA when there is no year", () => {
    expect(yearLabel({ year: 1995 })).toBe("1995");
    expect(yearLabel({ year: null })).toBe("TBA");
  });

  it("names the media types for people", () => {
    expect(typeLabel({ mediaType: "movie" })).toBe("Movie");
    expect(typeLabel({ mediaType: "tv" })).toBe("Series");
  });

  it("builds detail page routes", () => {
    expect(titlePath({ mediaType: "tv", id: 42 })).toBe("/tv/42");
  });
});

describe("truncate", () => {
  it("leaves short text alone", () => {
    expect(truncate("short", 20)).toBe("short");
  });

  it("cuts on a word boundary and adds an ellipsis", () => {
    expect(truncate("The quick brown fox jumps over the lazy dog", 20)).toBe("The quick brown fox…");
  });

  it("hard-cuts when there is no sensible word boundary", () => {
    expect(truncate("Supercalifragilisticexpialidocious word", 12)).toBe("Supercalifra…");
  });
});
