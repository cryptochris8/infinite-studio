// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api.ts", () => ({
  api: { profiles: vi.fn(), watchlist: vi.fn(), home: vi.fn() },
}));

import { api } from "./api.ts";
import { App } from "./App.tsx";
import { useProfile } from "./state/profile.ts";
import { makeTitle } from "./test-utils.tsx";

const mocked = vi.mocked(api);

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  useProfile.setState({ ready: false, error: null, profiles: [], current: null, watchlist: [] });
});

const renderApp = (route = "/") =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );

describe("App", () => {
  it("loads the profile, then shows the header and home page", async () => {
    mocked.profiles.mockResolvedValue([{ id: 1, name: "Family" }]);
    mocked.watchlist.mockResolvedValue([]);
    mocked.home.mockResolvedValue({ hero: [makeTitle(1)], rows: [] });

    renderApp();
    expect(screen.getByRole("status")).toHaveTextContent("Starting");
    expect(await screen.findByRole("heading", { level: 1, name: "Movie 1" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Profile: Family" })).toBeInTheDocument();
  });

  it("scrolls to the top when the page changes", async () => {
    mocked.profiles.mockResolvedValue([{ id: 1, name: "Family" }]);
    mocked.watchlist.mockResolvedValue([]);
    renderApp("/my-list");
    await screen.findByRole("heading", { name: "Family's List" });
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("shows a friendly page for unknown addresses", async () => {
    mocked.profiles.mockResolvedValue([{ id: 1, name: "Family" }]);
    mocked.watchlist.mockResolvedValue([]);
    renderApp("/nope");
    expect(await screen.findByText("Page not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute("href", "/");
  });

  it("explains when the server can't be reached and lets the user retry", async () => {
    mocked.profiles.mockRejectedValueOnce(new Error("Can't reach the multistream server. Is the Pi on?"));
    renderApp();
    expect(await screen.findByRole("alert")).toHaveTextContent("Can't reach the multistream server");

    mocked.profiles.mockResolvedValue([{ id: 1, name: "Family" }]);
    mocked.watchlist.mockResolvedValue([]);
    mocked.home.mockResolvedValue({ hero: [makeTitle(1)], rows: [] });
    screen.getByRole("button", { name: "Try again" }).click();
    expect(await screen.findByRole("heading", { level: 1, name: "Movie 1" })).toBeInTheDocument();
  });
});
