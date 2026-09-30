import { useEffect, useRef } from "react";

/** Focuses a new panel and returns to its opener after the panel closes. */
export function useAutoFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const frame = useRef<number | null>(null);
  // Capture before React hides the scene tags or removes the button that opened the panel.
  const opener = useRef(
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  useEffect(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    ref.current?.focus();
    const previous = opener.current;
    const app = ref.current?.closest(".app");
    return () => {
      frame.current = window.requestAnimationFrame(() => {
        frame.current = null;
        // A disposed app must not focus controls belonging to a replacement root.
        if (!app?.isConnected) return;
        // Another panel may already have taken focus in the same transition.
        const active = document.activeElement;
        if (active && active !== document.body && active.isConnected) return;
        const canReturn =
          previous &&
          previous !== document.body &&
          previous.isConnected &&
          !previous.closest("[hidden], [inert]");
        const target = canReturn
          ? previous
          : (app.querySelector<HTMLElement>(".btn-board") ??
            app.querySelector<HTMLElement>(".view"));
        if (target && !target.closest("[hidden], [inert]")) target.focus({ preventScroll: true });
      });
    };
  }, []);
  return ref;
}
