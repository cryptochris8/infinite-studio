// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../api.ts", () => ({
  api: { watchlist: vi.fn(), createProfile: vi.fn(), deleteProfile: vi.fn() },
}));

import { api } from "../api.ts";
import { useProfile } from "../state/profile.ts";
import { setProfileState } from "../test-utils.tsx";
import { ProfileMenu } from "./ProfileMenu.tsx";

const mocked = vi.mocked(api);
const family = { id: 1, name: "Family" };
const kid = { id: 2, name: "Kid" };

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  mocked.watchlist.mockResolvedValue([]);
  setProfileState({ profiles: [family, kid] });
});

const openMenu = () => fireEvent.click(screen.getByRole("button", { name: "Profile: Family" }));

describe("ProfileMenu", () => {
  it("renders nothing until a profile is loaded", () => {
    setProfileState({ current: null, profiles: [] });
    const { container } = render(<ProfileMenu />);
    expect(container).toBeEmptyDOMElement();
  });

  it("opens to list the profiles and marks the current one", () => {
    render(<ProfileMenu />);
    expect(screen.queryByText("Kid")).not.toBeInTheDocument();
    openMenu();
    expect(screen.getByText("Kid")).toBeInTheDocument();
    expect(screen.getByLabelText("Current profile")).toBeInTheDocument();
  });

  it("closes on Escape", () => {
    render(<ProfileMenu />);
    openMenu();
    fireEvent.keyDown(screen.getByText("Kid"), { key: "Escape" });
    expect(screen.queryByText("Kid")).not.toBeInTheDocument();
  });

  it("closes when clicking elsewhere", () => {
    render(<ProfileMenu />);
    openMenu();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByText("Kid")).not.toBeInTheDocument();
  });

  it("switches profile", async () => {
    render(<ProfileMenu />);
    openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Kid" }));
    await waitFor(() => expect(useProfile.getState().current).toEqual(kid));
    expect(mocked.watchlist).toHaveBeenCalledWith(2);
    expect(screen.queryByText("New profile")).not.toBeInTheDocument();
  });

  it("creates a profile and switches to it", async () => {
    mocked.createProfile.mockResolvedValue({ id: 3, name: "Grandma" });
    render(<ProfileMenu />);
    openMenu();
    fireEvent.change(screen.getByLabelText("New profile name"), { target: { value: "Grandma" } });
    fireEvent.click(screen.getByRole("button", { name: "Add profile" }));
    await waitFor(() => expect(useProfile.getState().current?.name).toBe("Grandma"));
    expect(mocked.createProfile).toHaveBeenCalledWith("Grandma");
  });

  it("shows the server's message when a profile can't be created", async () => {
    mocked.createProfile.mockRejectedValue(new Error("A profile with that name already exists"));
    render(<ProfileMenu />);
    openMenu();
    fireEvent.change(screen.getByLabelText("New profile name"), { target: { value: "kid" } });
    fireEvent.click(screen.getByRole("button", { name: "Add profile" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already exists");
  });

  it("does not submit a blank name", () => {
    render(<ProfileMenu />);
    openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Add profile" }));
    expect(mocked.createProfile).not.toHaveBeenCalled();
  });

  it("asks before deleting a profile", async () => {
    mocked.deleteProfile.mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, "confirm");
    render(<ProfileMenu />);
    openMenu();

    confirm.mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole("button", { name: "Delete profile Kid" }));
    expect(mocked.deleteProfile).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole("button", { name: "Delete profile Kid" }));
    await waitFor(() => expect(mocked.deleteProfile).toHaveBeenCalledWith(2));
  });

  it("offers no delete buttons when only one profile is left", () => {
    setProfileState({ profiles: [family] });
    render(<ProfileMenu />);
    openMenu();
    expect(screen.queryByRole("button", { name: /Delete profile/ })).not.toBeInTheDocument();
  });
});
