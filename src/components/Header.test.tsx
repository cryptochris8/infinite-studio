// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setProfileState } from "../test-utils.tsx";
import { Header } from "./Header.tsx";

function Where() {
  const loc = useLocation();
  return <output data-testid="where">{loc.pathname + loc.search}</output>;
}

function setup(route = "/") {
  render(
    <MemoryRouter initialEntries={[route]}>
      <Header />
      <Where />
    </MemoryRouter>,
  );
  return screen.getByRole("searchbox", { name: "Search movies and shows" });
}

const where = () => screen.getByTestId("where").textContent;

beforeEach(() => setProfileState());

describe("Header", () => {
  it("has the main navigation links", () => {
    setup();
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(Array.from(nav.querySelectorAll("a")).map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["Home", "/"],
      ["Movies", "/movies"],
      ["Shows", "/shows"],
      ["My List", "/my-list"],
    ]);
  });

  it("marks the current section", () => {
    setup("/movies");
    expect(screen.getByRole("link", { name: "Movies" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("searches after a pause in typing", () => {
    vi.useFakeTimers();
    const box = setup();
    fireEvent.change(box, { target: { value: "heat" } });
    expect(where()).toBe("/");
    act(() => void vi.advanceTimersByTime(500));
    expect(where()).toBe("/search?q=heat");
  });

  it("waits for at least two characters", () => {
    vi.useFakeTimers();
    const box = setup();
    fireEvent.change(box, { target: { value: "h" } });
    act(() => void vi.advanceTimersByTime(1000));
    expect(where()).toBe("/");
  });

  it("searches immediately on Enter and encodes the query", () => {
    const box = setup();
    fireEvent.change(box, { target: { value: "spider man & co" } });
    fireEvent.submit(box.closest("form")!);
    expect(where()).toBe("/search?q=spider%20man%20%26%20co");
  });

  it("ignores Enter on a blank box", () => {
    const box = setup();
    fireEvent.change(box, { target: { value: "   " } });
    fireEvent.submit(box.closest("form")!);
    expect(where()).toBe("/");
  });

  it("shows the current query when landing on the search page", () => {
    const box = setup("/search?q=alien");
    expect(box).toHaveValue("alien");
  });

  it("shows the profile menu", () => {
    setup();
    expect(screen.getByRole("button", { name: "Profile: Family" })).toBeInTheDocument();
  });
});
