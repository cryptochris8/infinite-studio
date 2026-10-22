import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isBackKey, keyToDirection, pickNext } from "../lib/spatial.ts";

const TEXT_FIELD = "input, textarea, select, [contenteditable='true']";

function visibleTargets(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-nav]")).filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && !el.hasAttribute("disabled");
  });
}

/**
 * Makes the arrow keys / TV remote D-pad move focus between cards, buttons and links, and
 * maps the remote's Back button to browser back. Mouse and touch users are unaffected.
 */
export function useRemoteNavigation(): void {
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      const inTextField = !!target?.matches?.(TEXT_FIELD);

      if (isBackKey(event)) {
        if (inTextField) return;
        if (window.history.length > 1) {
          event.preventDefault();
          navigate(-1);
        }
        return;
      }

      const direction = keyToDirection(event);
      if (!direction) return;
      // Left/Right move the caret while typing; Up/Down can leave the field.
      if (inTextField && (direction === "left" || direction === "right")) return;

      const targets = visibleTargets();
      if (targets.length === 0) return;

      const active = document.activeElement as HTMLElement | null;
      const onTarget = !!active && targets.includes(active);
      // Focus is nowhere useful yet (page just loaded): start at the first thing on screen.
      const from = onTarget ? active : inTextField ? target : null;

      let next: HTMLElement | undefined;
      if (!from) {
        next = targets[0];
      } else {
        const candidates = targets
          .filter((el) => el !== from)
          .map((el) => ({ el, box: el.getBoundingClientRect() }));
        next = pickNext(from.getBoundingClientRect(), candidates, direction)?.el;
      }
      if (!next) return; // at an edge: let the browser scroll as usual

      event.preventDefault();
      next.focus({ preventScroll: true });
      next.scrollIntoView({
        block: direction === "up" || direction === "down" ? "center" : "nearest",
        inline: direction === "left" || direction === "right" ? "center" : "nearest",
        behavior: "smooth",
      });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);
}
