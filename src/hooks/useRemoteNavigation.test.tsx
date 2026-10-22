// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { useRemoteNavigation } from "./useRemoteNavigation.ts";

// jsdom has no layout, so give each button a position by hand.
const layout: Record<string, [number, number]> = { a: [0, 0], b: [150, 0], c: [0, 200], d: [150, 200] };

function rectFor(id: string): DOMRect {
  const [left, top] = layout[id]!;
  return { left, top, width: 100, height: 100, right: left + 100, bottom: top + 100, x: left, y: top, toJSON() {} } as DOMRect;
}

function place(el: HTMLElement | null, id: string): void {
  if (el) el.getBoundingClientRect = () => rectFor(id);
}

function Harness() {
  useRemoteNavigation();
  const loc = useLocation();
  return (
    <>
      <output data-testid="path">{loc.pathname}</output>
      {Object.keys(layout).map((id) => (
        <button key={id} data-nav ref={(el) => place(el, id)}>
          {id}
        </button>
      ))}
      <input aria-label="field" data-nav ref={(el) => place(el, "a")} />
    </>
  );
}

function setup(entries = ["/"], index = 0) {
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={index}>
      <Harness />
    </MemoryRouter>,
  );
}

const press = (key: string, extra: Partial<KeyboardEventInit> = {}) =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key, ...extra });

afterEach(() => {
  Object.defineProperty(window.history, "length", { value: 1, configurable: true });
});

describe("useRemoteNavigation", () => {
  it("starts at the first target when nothing is focused", () => {
    setup();
    press("ArrowRight");
    expect(screen.getByRole("button", { name: "a" })).toHaveFocus();
  });

  it("moves focus in the direction pressed", () => {
    setup();
    screen.getByRole("button", { name: "a" }).focus();
    press("ArrowRight");
    expect(screen.getByRole("button", { name: "b" })).toHaveFocus();
    press("ArrowDown");
    expect(screen.getByRole("button", { name: "d" })).toHaveFocus();
    press("ArrowLeft");
    expect(screen.getByRole("button", { name: "c" })).toHaveFocus();
    press("ArrowUp");
    expect(screen.getByRole("button", { name: "a" })).toHaveFocus();
  });

  it("scrolls the newly focused item into view", () => {
    setup();
    screen.getByRole("button", { name: "a" }).focus();
    press("ArrowRight");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("leaves the arrow key alone at an edge so the page can scroll", () => {
    setup();
    screen.getByRole("button", { name: "a" }).focus();
    const notCancelled = fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft", cancelable: true });
    expect(notCancelled).toBe(true);
    expect(screen.getByRole("button", { name: "a" })).toHaveFocus();
  });

  it("ignores keys with modifiers", () => {
    setup();
    screen.getByRole("button", { name: "a" }).focus();
    press("ArrowRight", { ctrlKey: true });
    expect(screen.getByRole("button", { name: "a" })).toHaveFocus();
  });

  it("lets Left and Right move the caret in a text field", () => {
    setup();
    const field = screen.getByLabelText("field");
    field.focus();
    press("ArrowRight");
    expect(field).toHaveFocus();
  });

  it("lets Down leave a text field", () => {
    setup();
    screen.getByLabelText("field").focus();
    press("ArrowDown");
    expect(screen.getByLabelText("field")).not.toHaveFocus();
  });

  it("goes back on Escape when there is history", () => {
    Object.defineProperty(window.history, "length", { value: 3, configurable: true });
    setup(["/first", "/second"], 1);
    expect(screen.getByTestId("path")).toHaveTextContent("/second");
    press("Escape");
    expect(screen.getByTestId("path")).toHaveTextContent("/first");
  });

  it("goes back on the Samsung and LG remote Back codes", () => {
    Object.defineProperty(window.history, "length", { value: 3, configurable: true });
    setup(["/first", "/second"], 1);
    press("Unidentified", { keyCode: 10009 });
    expect(screen.getByTestId("path")).toHaveTextContent("/first");
  });

  it("does nothing on Back when there is no history", () => {
    setup(["/only"]);
    press("Escape");
    expect(screen.getByTestId("path")).toHaveTextContent("/only");
  });

  it("does not treat Escape as Back while typing", () => {
    Object.defineProperty(window.history, "length", { value: 3, configurable: true });
    setup(["/first", "/second"], 1);
    const field = screen.getByLabelText("field");
    field.focus();
    press("Escape");
    expect(screen.getByTestId("path")).toHaveTextContent("/second");
  });
});
