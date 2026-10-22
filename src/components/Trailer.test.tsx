// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CastList } from "./CastList.tsx";
import { Trailer } from "./Trailer.tsx";

describe("Trailer", () => {
  it("renders nothing without a trailer", () => {
    const { container } = render(<Trailer trailer={null} title="Heat" backdropPath={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a play button first and only loads YouTube after it is pressed", () => {
    render(<Trailer trailer={{ key: "abc123", name: "Official" }} title="Heat" backdropPath="/b.jpg" />);
    expect(document.querySelector("iframe")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Play Heat trailer" }));
    const frame = document.querySelector("iframe")!;
    expect(frame).toHaveAttribute("title", "Heat trailer");
    const src = new URL(frame.getAttribute("src")!);
    expect(src.hostname).toBe("www.youtube-nocookie.com");
    expect(src.pathname).toBe("/embed/abc123");
    expect(src.searchParams.get("autoplay")).toBe("1");
    expect(screen.queryByRole("button", { name: /Play/ })).not.toBeInTheDocument();
  });
});

describe("CastList", () => {
  it("shows each person with their character", () => {
    render(
      <CastList
        cast={[
          { id: 1, name: "Al Pacino", character: "Vincent", profilePath: "/al.jpg" },
          { id: 2, name: "No Photo", character: "", profilePath: null },
        ]}
      />,
    );
    expect(screen.getByText("Al Pacino")).toBeInTheDocument();
    expect(screen.getByText("Vincent")).toBeInTheDocument();
    expect(screen.getByText("No Photo")).toBeInTheDocument();
    expect(document.querySelectorAll("img")).toHaveLength(1);
  });

  it("renders nothing for an empty cast", () => {
    const { container } = render(<CastList cast={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
