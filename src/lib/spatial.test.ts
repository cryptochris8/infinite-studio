import { describe, expect, it } from "vitest";
import { isBackKey, keyToDirection, pickNext, type Box } from "./spatial.ts";

const box = (left: number, top: number, width = 100, height = 150): Box => ({ left, top, width, height });
const item = (name: string, b: Box) => ({ name, box: b });

// Two rows of three cards.
const grid = [
  item("a1", box(0, 0)),
  item("a2", box(120, 0)),
  item("a3", box(240, 0)),
  item("b1", box(0, 200)),
  item("b2", box(120, 200)),
  item("b3", box(240, 200)),
];
const find = (name: string) => grid.find((g) => g.name === name)!;
const next = (from: string, dir: Parameters<typeof pickNext>[2]) =>
  pickNext(find(from).box, grid.filter((g) => g.name !== from), dir)?.name;

describe("pickNext", () => {
  it("moves right and left along a row", () => {
    expect(next("a1", "right")).toBe("a2");
    expect(next("a3", "left")).toBe("a2");
  });

  it("moves down and up staying in the same column", () => {
    expect(next("a2", "down")).toBe("b2");
    expect(next("b3", "up")).toBe("a3");
  });

  it("returns undefined at the edge of the layout", () => {
    expect(next("a1", "left")).toBeUndefined();
    expect(next("a1", "up")).toBeUndefined();
    expect(next("b3", "right")).toBeUndefined();
    expect(next("b3", "down")).toBeUndefined();
  });

  it("prefers the aligned item over a nearer one that is off to the side", () => {
    const current = box(100, 0);
    const near = item("near-but-sideways", box(300, 160, 100, 50));
    const aligned = item("aligned", box(100, 400));
    expect(pickNext(current, [near, aligned], "down")?.name).toBe("aligned");
  });

  it("works with no candidates", () => {
    expect(pickNext(box(0, 0), [], "right")).toBeUndefined();
  });
});

describe("keyToDirection", () => {
  it("maps arrow keys and ignores others", () => {
    expect(keyToDirection({ key: "ArrowDown" })).toBe("down");
    expect(keyToDirection({ key: "ArrowLeft" })).toBe("left");
    expect(keyToDirection({ key: "Enter" })).toBeUndefined();
  });
});

describe("isBackKey", () => {
  it("recognises Escape, named back keys and Samsung/LG remote codes", () => {
    expect(isBackKey({ key: "Escape" })).toBe(true);
    expect(isBackKey({ key: "XF86Back" })).toBe(true);
    expect(isBackKey({ key: "Unidentified", keyCode: 10009 })).toBe(true);
    expect(isBackKey({ key: "Unidentified", keyCode: 461 })).toBe(true);
  });

  it("does not treat Backspace or letters as Back", () => {
    expect(isBackKey({ key: "Backspace", keyCode: 8 })).toBe(false);
    expect(isBackKey({ key: "b" })).toBe(false);
  });
});
