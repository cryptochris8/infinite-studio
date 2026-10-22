import { describe, expect, it } from "vitest";
import type { Availability, Provider } from "./types.ts";
import { groupAvailability } from "./availability.ts";

const p = (id: number, name = `P${id}`): Provider => ({ id, name, logoPath: null, url: null });
const empty: Availability = { link: null, free: [], ads: [], subscription: [], rent: [], buy: [] };

describe("groupAvailability", () => {
  it("returns empty groups when there is nothing", () => {
    expect(groupAvailability(empty)).toEqual({ free: [], subscription: [], paid: [], link: null });
  });

  it("puts free and ad-supported services together, flagging the ones with ads", () => {
    const g = groupAvailability({ ...empty, free: [p(1)], ads: [p(2)] });
    expect(g.free.map((o) => [o.id, o.withAds])).toEqual([
      [1, undefined],
      [2, true],
    ]);
  });

  it("lists a service once when it is in both free and ads", () => {
    const g = groupAvailability({ ...empty, free: [p(1)], ads: [p(1)] });
    expect(g.free).toHaveLength(1);
    expect(g.free[0]?.withAds).toBeUndefined();
  });

  it("merges rent and buy without duplicates", () => {
    const g = groupAvailability({ ...empty, rent: [p(3), p(4)], buy: [p(4), p(5)] });
    expect(g.paid.map((x) => x.id)).toEqual([3, 4, 5]);
  });

  it("does not repeat a free service under subscription or paid", () => {
    const g = groupAvailability({ ...empty, free: [p(1)], subscription: [p(1), p(2)], rent: [p(1), p(3)] });
    expect(g.subscription.map((x) => x.id)).toEqual([2]);
    expect(g.paid.map((x) => x.id)).toEqual([3]);
  });

  it("passes the all-services link through", () => {
    expect(groupAvailability({ ...empty, link: "https://x.test" }).link).toBe("https://x.test");
  });
});
