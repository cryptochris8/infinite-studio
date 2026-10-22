// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../api.ts", () => ({
  api: { addToWatchlist: vi.fn(), removeFromWatchlist: vi.fn() },
}));

import { api } from "../api.ts";
import { makeTitle, renderWithRouter, setProfileState } from "../test-utils.tsx";
import { SaveButton } from "./SaveButton.tsx";

const mocked = vi.mocked(api);

beforeEach(() => {
  vi.resetAllMocks();
  setProfileState();
});

describe("SaveButton", () => {
  it("starts unsaved and saves on click", async () => {
    mocked.addToWatchlist.mockResolvedValue(undefined);
    renderWithRouter(<SaveButton title={makeTitle(1)} />);
    const button = screen.getByRole("button", { name: "My List" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(button);
    expect(await screen.findByRole("button", { name: "In My List" })).toHaveAttribute("aria-pressed", "true");
    expect(mocked.addToWatchlist).toHaveBeenCalledWith(1, "movie", 1);
  });

  it("shows saved titles as saved and removes them on click", async () => {
    mocked.removeFromWatchlist.mockResolvedValue(undefined);
    setProfileState({ watchlist: [makeTitle(1)] });
    renderWithRouter(<SaveButton title={makeTitle(1)} />);
    fireEvent.click(screen.getByRole("button", { name: "In My List" }));
    expect(await screen.findByRole("button", { name: "My List" })).toBeInTheDocument();
    expect(mocked.removeFromWatchlist).toHaveBeenCalledWith(1, "movie", 1);
  });

  it("goes back to unsaved if the server refuses", async () => {
    mocked.addToWatchlist.mockRejectedValue(new Error("down"));
    renderWithRouter(<SaveButton title={makeTitle(1)} />);
    fireEvent.click(screen.getByRole("button", { name: "My List" }));
    await waitFor(() => expect(mocked.addToWatchlist).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("button", { name: "My List" })).toHaveAttribute("aria-pressed", "false"));
  });

  it("is disabled before a profile is loaded", () => {
    setProfileState({ current: null });
    renderWithRouter(<SaveButton title={makeTitle(1)} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
