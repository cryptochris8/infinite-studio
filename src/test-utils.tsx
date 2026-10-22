import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import type { Title, TitleDetails } from "@shared/types.ts";
import { useProfile } from "./state/profile.ts";

export function makeTitle(id: number, overrides: Partial<Title> = {}): Title {
  return {
    id,
    mediaType: "movie",
    title: `Movie ${id}`,
    overview: `Overview for movie ${id}.`,
    posterPath: `/poster${id}.jpg`,
    backdropPath: `/backdrop${id}.jpg`,
    year: 2000 + (id % 25),
    rating: 7.5,
    voteCount: 500,
    genreIds: [],
    ...overrides,
  };
}

export function makeDetails(id: number, overrides: Partial<TitleDetails> = {}): TitleDetails {
  return {
    ...makeTitle(id),
    tagline: "A tagline.",
    runtime: 125,
    genres: [{ id: 28, name: "Action" }],
    certification: "PG-13",
    status: "Released",
    seasons: null,
    directors: ["Jane Director"],
    cast: [{ id: 1, name: "Ann Actor", character: "Hero", profilePath: "/ann.jpg" }],
    trailer: { key: "abc123", name: "Official Trailer" },
    availability: {
      link: "https://justwatch.test/title",
      free: [{ id: 73, name: "Tubi", logoPath: "/tubi.jpg", url: "https://tubitv.com/search/Movie%20" + id }],
      ads: [],
      subscription: [{ id: 8, name: "Netflix", logoPath: null, url: null }],
      rent: [],
      buy: [],
    },
    similar: [makeTitle(900), makeTitle(901)],
    ...overrides,
  };
}

/** Renders inside a router at the given URL. */
export function renderWithRouter(ui: ReactElement, route = "/") {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

/** Puts the profile store in a signed-in state without hitting the network. */
export function setProfileState(overrides: Partial<ReturnType<typeof useProfile.getState>> = {}) {
  useProfile.setState({
    ready: true,
    error: null,
    profiles: [{ id: 1, name: "Family" }],
    current: { id: 1, name: "Family" },
    watchlist: [],
    ...overrides,
  });
}
