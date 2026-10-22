// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Availability } from "@shared/types.ts";
import { makeDetails } from "../test-utils.tsx";
import { WhereToWatch } from "./WhereToWatch.tsx";

const empty: Availability = { link: null, free: [], ads: [], subscription: [], rent: [], buy: [] };

describe("WhereToWatch", () => {
  it("lists free services first, linking straight to the service", () => {
    render(<WhereToWatch availability={makeDetails(1).availability} />);
    const free = screen.getByText("Watch free").parentElement!;
    const tubi = within(free).getByRole("link", { name: /Tubi/ });
    expect(tubi).toHaveAttribute("href", "https://tubitv.com/search/Movie%201");
    expect(tubi).toHaveAttribute("target", "_blank");
    expect(tubi).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("falls back to the all-services page for a service with no direct link", () => {
    render(<WhereToWatch availability={makeDetails(1).availability} />);
    const netflix = screen.getByRole("link", { name: /Netflix/ });
    expect(netflix).toHaveAttribute("href", "https://justwatch.test/title");
    expect(screen.getByRole("link", { name: /See every option/ })).toHaveAttribute("href", "https://justwatch.test/title");
  });

  it("labels ad-supported services", () => {
    render(
      <WhereToWatch
        availability={{ ...empty, ads: [{ id: 300, name: "Pluto TV", logoPath: null, url: "https://pluto.tv/x" }] }}
      />,
    );
    expect(screen.getByText("Free with ads")).toBeInTheDocument();
    expect(screen.getByText("Watch free")).toBeInTheDocument();
  });

  it("says so when the title isn't free anywhere but can be rented", () => {
    render(
      <WhereToWatch
        availability={{ ...empty, rent: [{ id: 2, name: "Apple TV", logoPath: null, url: null }], link: "https://jw.test" }}
      />,
    );
    expect(screen.getByText(/Not free anywhere right now/)).toBeInTheDocument();
    expect(screen.queryByText("Watch free")).not.toBeInTheDocument();
    expect(screen.getByText("Rent or buy")).toBeInTheDocument();
  });

  it("shows plain text, not a dead link, when a service has no URL at all", () => {
    render(<WhereToWatch availability={{ ...empty, buy: [{ id: 2, name: "Apple TV", logoPath: null, url: null }] }} />);
    expect(screen.queryByRole("link", { name: /Apple TV/ })).not.toBeInTheDocument();
    expect(screen.getByText("Apple TV")).toBeInTheDocument();
  });

  it("explains when nothing is listed", () => {
    render(<WhereToWatch availability={empty} />);
    expect(screen.getByText(/No streaming options listed yet/)).toBeInTheDocument();
  });
});
