// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeTitle, renderWithRouter } from "../test-utils.tsx";
import { PosterCard } from "./PosterCard.tsx";

describe("PosterCard", () => {
  it("links to the title's detail page with a descriptive name", () => {
    renderWithRouter(<PosterCard title={makeTitle(1, { year: 1995 })} />);
    const link = screen.getByRole("link", { name: "Movie 1, Movie, 1995" });
    expect(link).toHaveAttribute("href", "/movie/1");
  });

  it("links shows to /tv", () => {
    renderWithRouter(<PosterCard title={makeTitle(7, { mediaType: "tv", title: "Show 7" })} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/tv/7");
    expect(screen.getByRole("link")).toHaveAccessibleName(/Series/);
  });

  it("shows the poster and the rating badge", () => {
    const { container } = renderWithRouter(<PosterCard title={makeTitle(1, { rating: 8.24 })} />);
    expect(container.querySelector("img")).toHaveAttribute("src", "https://image.tmdb.org/t/p/w342/poster1.jpg");
    expect(screen.getByText("8.2")).toBeInTheDocument();
  });

  it("hides the rating badge when there are too few votes", () => {
    renderWithRouter(<PosterCard title={makeTitle(1, { voteCount: 1, rating: 10 })} />);
    expect(screen.queryByText("10.0")).not.toBeInTheDocument();
  });

  it("falls back to the title text when there is no poster", () => {
    const { container } = renderWithRouter(<PosterCard title={makeTitle(2, { posterPath: null })} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getAllByText("Movie 2").length).toBeGreaterThan(0);
  });

  it("is a remote-control focus target", () => {
    renderWithRouter(<PosterCard title={makeTitle(1)} />);
    expect(screen.getByRole("link")).toHaveAttribute("data-nav");
  });
});
