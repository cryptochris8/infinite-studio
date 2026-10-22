// @vitest-environment jsdom
import { act, fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeTitle, renderWithRouter, setProfileState } from "../test-utils.tsx";
import { Hero } from "./Hero.tsx";

const titles = [makeTitle(1), makeTitle(2), makeTitle(3)];

beforeEach(() => setProfileState());

describe("Hero", () => {
  it("features the first title with a link to its details", () => {
    renderWithRouter(<Hero titles={titles} />);
    expect(screen.getByRole("heading", { level: 1, name: "Movie 1" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Details/ })).toHaveAttribute("href", "/movie/1");
    expect(screen.getByRole("button", { name: "My List" })).toBeInTheDocument();
  });

  it("renders nothing without titles", () => {
    const { container } = renderWithRouter(<Hero titles={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("has no slide dots for a single title", () => {
    renderWithRouter(<Hero titles={[makeTitle(1)]} />);
    expect(screen.queryByRole("group", { name: "Choose featured title" })).not.toBeInTheDocument();
  });

  it("switches title when a dot is pressed", () => {
    renderWithRouter(<Hero titles={titles} />);
    fireEvent.click(screen.getByRole("button", { name: "Show Movie 3" }));
    expect(screen.getByRole("heading", { level: 1, name: "Movie 3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show Movie 3" })).toHaveAttribute("aria-current", "true");
  });

  it("advances automatically and wraps around", () => {
    vi.useFakeTimers();
    renderWithRouter(<Hero titles={titles} intervalMs={1000} />);
    act(() => void vi.advanceTimersByTime(1000));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Movie 2");
    act(() => void vi.advanceTimersByTime(2000));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Movie 1");
  });

  it("holds still while the pointer is over it, then resumes", () => {
    vi.useFakeTimers();
    renderWithRouter(<Hero titles={titles} intervalMs={1000} />);
    const section = screen.getByRole("region", { name: "Featured" });
    fireEvent.mouseEnter(section);
    act(() => void vi.advanceTimersByTime(5000));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Movie 1");
    fireEvent.mouseLeave(section);
    act(() => void vi.advanceTimersByTime(1000));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Movie 2");
  });

  it("can have auto-advance turned off", () => {
    vi.useFakeTimers();
    renderWithRouter(<Hero titles={titles} intervalMs={0} />);
    act(() => void vi.advanceTimersByTime(60_000));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Movie 1");
  });

  it("shortens a very long description", () => {
    renderWithRouter(<Hero titles={[makeTitle(1, { overview: "word ".repeat(100) })]} />);
    expect(screen.getByText(/…$/)).toBeInTheDocument();
  });
});
