export type Direction = "left" | "right" | "up" | "down";

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const center = (b: Box) => ({ x: b.left + b.width / 2, y: b.top + b.height / 2 });

/**
 * Picks the next focus target for a D-pad press: the nearest candidate that lies in the
 * pressed direction, with sideways drift penalised so Down stays in the same column of cards.
 */
export function pickNext<T extends { box: Box }>(current: Box, candidates: T[], direction: Direction): T | undefined {
  const from = center(current);
  let best: { item: T; score: number } | undefined;

  for (const item of candidates) {
    const to = center(item.box);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const horizontal = direction === "left" || direction === "right";
    const along = horizontal ? (direction === "right" ? dx : -dx) : direction === "down" ? dy : -dy;
    const across = Math.abs(horizontal ? dy : dx);
    // Must be strictly ahead, by at least a sliver, or we'd keep "moving" to ourselves.
    if (along <= 1) continue;
    const score = along + across * 2.5;
    if (!best || score < best.score) best = { item, score };
  }
  return best?.item;
}

interface KeyLike {
  key: string;
  keyCode?: number;
}

const ARROWS: Record<string, Direction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};

export function keyToDirection(event: KeyLike): Direction | undefined {
  return ARROWS[event.key];
}

// Samsung (Tizen) sends 10009, LG (webOS) sends 461, others use these names.
const BACK_KEY_CODES = new Set([10009, 461]);
const BACK_KEYS = new Set(["Escape", "BrowserBack", "GoBack", "XF86Back"]);

/** True for a TV remote's Back button. Backspace is left alone so typing still works. */
export function isBackKey(event: KeyLike): boolean {
  return BACK_KEYS.has(event.key) || (event.keyCode !== undefined && BACK_KEY_CODES.has(event.keyCode));
}
