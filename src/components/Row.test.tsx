// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeTitle, renderWithRouter } from "../test-utils.tsx";
import { Row } from "./Row.tsx";

describe("Row", () => {
  it("shows its heading and one card per title", () => {
    renderWithRouter(<Row title="Trending" items={[makeTitle(1), makeTitle(2), makeTitle(3)]} />);
    expect(screen.getByRole("heading", { name: "Trending" })).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("renders nothing when there are no titles", () => {
    const { container } = renderWithRouter(<Row title="Empty" items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("scrolls the row when the arrows are pressed", () => {
    renderWithRouter(<Row title="Trending" items={[makeTitle(1)]} />);
    fireEvent.click(screen.getByRole("button", { name: "Scroll Trending right" }));
    fireEvent.click(screen.getByRole("button", { name: "Scroll Trending left" }));
    const calls = vi.mocked(Element.prototype.scrollBy).mock.calls;
    expect(calls.at(-2)?.[0]).toMatchObject({ behavior: "smooth" });
    expect((calls.at(-1)?.[0] as ScrollToOptions).left).toBeLessThanOrEqual(0);
  });
});
