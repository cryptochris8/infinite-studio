// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../api.ts", () => ({
  api: {
    home: vi.fn(),
    genres: vi.fn(),
    browse: vi.fn(),
    search: vi.fn(),
    title: vi.fn(),
    addToWatchlist: vi.fn(),
    removeFromWatchlist: vi.fn(),
  },
}));

import { api } from "../api.ts";
import { makeDetails, makeTitle, setProfileState } from "../test-utils.tsx";
import { BrowsePage } from "./BrowsePage.tsx";
import { DetailPage } from "./DetailPage.tsx";
import { HomePage } from "./HomePage.tsx";
import { MyListPage } from "./MyListPage.tsx";
import { SearchPage } from "./SearchPage.tsx";

const mocked = vi.mocked(api);
const page = (n: number, total: number, ids: number[]) => ({
  page: n,
  totalPages: total,
  items: ids.map((i) => makeTitle(i)),
});

beforeEach(() => {
  vi.resetAllMocks();
  setProfileState();
  document.title = "multistream";
});

describe("HomePage", () => {
  it("shows the featured hero and each row", async () => {
    mocked.home.mockResolvedValue({
      hero: [makeTitle(1), makeTitle(2)],
      rows: [
        { id: "trending", title: "Trending This Week", items: [makeTitle(3)] },
        { id: "upcoming", title: "Coming Soon", items: [makeTitle(4)] },
      ],
    });
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(await screen.findByRole("heading", { level: 1, name: "Movie 1" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Trending This Week" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Coming Soon" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "My List" })).not.toBeInTheDocument();
  });

  it("adds a My List row once something is saved", async () => {
    setProfileState({ watchlist: [makeTitle(9)] });
    mocked.home.mockResolvedValue({ hero: [makeTitle(1)], rows: [] });
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    const row = await screen.findByRole("region", { name: "My List" });
    expect(within(row).getByRole("link")).toHaveAttribute("href", "/movie/9");
  });

  it("shows an error and retries", async () => {
    mocked.home.mockRejectedValueOnce(new Error("Can't reach the multistream server. Is the Pi on?"));
    mocked.home.mockResolvedValueOnce({ hero: [makeTitle(1)], rows: [] });
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Can't reach the multistream server");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Movie 1" })).toBeInTheDocument();
  });
});

describe("BrowsePage", () => {
  beforeEach(() => {
    mocked.genres.mockResolvedValue([
      { id: 28, name: "Action" },
      { id: 18, name: "Drama" },
    ]);
    mocked.browse.mockResolvedValue(page(1, 2, [1, 2]));
  });

  const renderBrowse = (route = "/movies", type: "movie" | "tv" = "movie") =>
    render(
      <MemoryRouter initialEntries={[route]}>
        <BrowsePage type={type} />
      </MemoryRouter>,
    );

  it("shows a grid of titles and the genre chips", async () => {
    renderBrowse();
    expect(await screen.findByRole("link", { name: /Movie 1/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Movies" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Action" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    expect(mocked.browse).toHaveBeenCalledWith("movie", { genre: undefined, sort: "popularity.desc", page: 1 }, expect.any(AbortSignal));
  });

  it("uses the Shows heading and tv data for the shows page", async () => {
    renderBrowse("/shows", "tv");
    expect(await screen.findByRole("heading", { name: "Shows" })).toBeInTheDocument();
    expect(mocked.genres).toHaveBeenCalledWith("tv", expect.any(AbortSignal));
  });

  it("filters by genre", async () => {
    renderBrowse();
    fireEvent.click(await screen.findByRole("button", { name: "Drama" }));
    await waitFor(() =>
      expect(mocked.browse).toHaveBeenLastCalledWith("movie", { genre: 18, sort: "popularity.desc", page: 1 }, expect.any(AbortSignal)),
    );
    expect(screen.getByRole("button", { name: "Drama" })).toHaveAttribute("aria-pressed", "true");
  });

  it("restores the genre and sort from the URL", async () => {
    renderBrowse("/movies?genre=28&sort=vote_average.desc");
    await screen.findByRole("link", { name: /Movie 1/ });
    expect(mocked.browse).toHaveBeenCalledWith("movie", { genre: 28, sort: "vote_average.desc", page: 1 }, expect.any(AbortSignal));
    expect(screen.getByRole("combobox")).toHaveValue("vote_average.desc");
  });

  it("changes the sort order", async () => {
    renderBrowse();
    await screen.findByRole("link", { name: /Movie 1/ });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "primary_release_date.desc" } });
    await waitFor(() =>
      expect(mocked.browse).toHaveBeenLastCalledWith("movie", { genre: undefined, sort: "primary_release_date.desc", page: 1 }, expect.any(AbortSignal)),
    );
  });

  it("loads more titles", async () => {
    mocked.browse.mockResolvedValueOnce(page(1, 2, [1, 2])).mockResolvedValueOnce(page(2, 2, [3]));
    renderBrowse();
    fireEvent.click(await screen.findByRole("button", { name: "Load more" }));
    expect(await screen.findByRole("link", { name: /Movie 3/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("explains an empty result and a failure", async () => {
    mocked.browse.mockResolvedValueOnce(page(1, 1, []));
    renderBrowse();
    expect(await screen.findByText("Nothing here")).toBeInTheDocument();
  });

  it("shows an error with retry when the first load fails", async () => {
    mocked.browse.mockRejectedValueOnce(new Error("TMDB request failed (502)"));
    renderBrowse();
    expect(await screen.findByRole("alert")).toHaveTextContent("TMDB request failed (502)");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("link", { name: /Movie 1/ })).toBeInTheDocument();
  });
});

describe("SearchPage", () => {
  const renderSearch = (route: string) =>
    render(
      <MemoryRouter initialEntries={[route]}>
        <SearchPage />
      </MemoryRouter>,
    );

  it("prompts when there is no query and doesn't call the API", () => {
    renderSearch("/search");
    expect(screen.getByText("Search for a movie or show")).toBeInTheDocument();
    expect(mocked.search).not.toHaveBeenCalled();
  });

  it("shows results for the query", async () => {
    mocked.search.mockResolvedValue(page(1, 1, [1, 2]));
    renderSearch("/search?q=heat");
    expect(await screen.findByRole("heading", { name: 'Results for "heat"' })).toBeInTheDocument();
    expect(await screen.findAllByRole("link")).toHaveLength(2);
    expect(mocked.search).toHaveBeenCalledWith("heat", 1, expect.any(AbortSignal));
  });

  it("says when nothing matched", async () => {
    mocked.search.mockResolvedValue(page(1, 0, []));
    renderSearch("/search?q=zzzz");
    expect(await screen.findByText('No results for "zzzz"')).toBeInTheDocument();
  });
});

describe("MyListPage", () => {
  it("invites the user to save something when empty", () => {
    render(<MemoryRouter><MyListPage /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Family's List" })).toBeInTheDocument();
    expect(screen.getByText("Nothing saved yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse movies" })).toHaveAttribute("href", "/movies");
  });

  it("lists saved titles", () => {
    setProfileState({ watchlist: [makeTitle(1), makeTitle(2, { mediaType: "tv", title: "Show 2" })] });
    render(<MemoryRouter><MyListPage /></MemoryRouter>);
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });
});

describe("DetailPage", () => {
  const renderDetail = (route: string) =>
    render(
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/movie/:id" element={<DetailPage type="movie" />} />
          <Route path="/tv/:id" element={<DetailPage type="tv" />} />
        </Routes>
      </MemoryRouter>,
    );

  it("shows everything about the title", async () => {
    mocked.title.mockResolvedValue(makeDetails(5));
    renderDetail("/movie/5");

    expect(await screen.findByRole("heading", { level: 1, name: "Movie 5" })).toBeInTheDocument();
    expect(screen.getByText("A tagline.")).toBeInTheDocument();
    expect(screen.getByText("PG-13")).toBeInTheDocument();
    expect(screen.getByText(/2h 5m/)).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();
    expect(screen.getByText("Overview for movie 5.")).toBeInTheDocument();
    expect(screen.getByText("Directed by")).toBeInTheDocument();
    expect(screen.getByText("Jane Director")).toBeInTheDocument();

    expect(screen.getByRole("region", { name: "Where to watch" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play Movie 5 trailer" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Cast" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "More like this" })).toBeInTheDocument();
    expect(mocked.title).toHaveBeenCalledWith("movie", 5, expect.any(AbortSignal));
  });

  it("sets the page title and restores it on leaving", async () => {
    mocked.title.mockResolvedValue(makeDetails(5));
    const { unmount } = renderDetail("/movie/5");
    await screen.findByRole("heading", { level: 1 });
    expect(document.title).toBe("Movie 5 · multistream");
    unmount();
    expect(document.title).toBe("multistream");
  });

  it("describes a series with seasons and creators", async () => {
    mocked.title.mockResolvedValue(
      makeDetails(8, { mediaType: "tv", title: "Show 8", seasons: 3, runtime: 50, directors: ["Dan Erickson"] }),
    );
    renderDetail("/tv/8");
    expect(await screen.findByText("Created by")).toBeInTheDocument();
    expect(screen.getByText(/Series · .* · 50m · 3 seasons/)).toBeInTheDocument();
    expect(mocked.title).toHaveBeenCalledWith("tv", 8, expect.any(AbortSignal));
  });

  it("copes with a title that has little data", async () => {
    mocked.title.mockResolvedValue(
      makeDetails(5, {
        overview: "",
        tagline: "",
        trailer: null,
        cast: [],
        similar: [],
        directors: [],
        genres: [],
        certification: null,
        runtime: null,
        availability: { link: null, free: [], ads: [], subscription: [], rent: [], buy: [] },
      }),
    );
    renderDetail("/movie/5");
    expect(await screen.findByText("No description available yet.")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Trailer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Cast" })).not.toBeInTheDocument();
    expect(screen.getByText(/No streaming options listed yet/)).toBeInTheDocument();
  });

  it("shows the server's message when the title isn't found", async () => {
    mocked.title.mockRejectedValue(new Error("Not found"));
    renderDetail("/movie/404");
    expect(await screen.findByRole("alert")).toHaveTextContent("Not found");
  });

  it("rejects a bad id without calling the API", async () => {
    renderDetail("/movie/abc");
    expect(await screen.findByRole("alert")).toHaveTextContent("That title doesn't exist.");
    expect(mocked.title).not.toHaveBeenCalled();
  });
});
